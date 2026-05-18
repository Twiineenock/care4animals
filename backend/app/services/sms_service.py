import africastalking
import requests
from ..config import settings
from sqlalchemy.orm import Session
from ..models import SMSLog

# 1. Initialize Africa's Talking using Pydantic Settings if specified
# We do this conditionally to avoid startup crashes if Africa's Talking is not used.
sms = None
if settings.sms_provider.lower() == "africastalking":
    try:
        africastalking.initialize(settings.at_username, settings.at_api_key)
        sms = africastalking.SMS
    except Exception as e:
        print(f"CRITICAL: Failed to initialize Africa's Talking: {e}")

def send_and_log_sms(db: Session, user_id: int, phone_number: str, message: str):
    """
    Sends an SMS and logs the result in the database.
    Supports Africa's Talking and Textbee as alternative SMS gateways.
    Satisfies Issue #10: 'System can send SMS' and 'Messages are logged'
    """
    # 2. Create the initial log entry (Status: Pending)
    db_log = SMSLog(
        user_id=user_id,
        phone_number=phone_number,
        message_body=message,
        status="pending"
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)

    provider = settings.sms_provider.lower()

    if provider == "textbee":
        try:
            if not settings.textbee_api_key or not settings.textbee_device_id:
                raise ValueError("Textbee configuration (API Key or Device ID) is missing!")
            
            url = f"https://api.textbee.dev/api/v1/gateway/devices/{settings.textbee_device_id}/send-sms"
            headers = {
                "x-api-key": settings.textbee_api_key,
                "Content-Type": "application/json"
            }
            payload = {
                "recipients": [phone_number],
                "message": message
            }
            
            # Send SMS via Textbee
            response = requests.post(url, json=payload, headers=headers, timeout=15)
            
            if response.status_code in [200, 201]:
                res_data = response.json()
                db_log.status = "queued"  # Textbee queues the message for Android device delivery
                
                # Check response structure to capture the SMS ID
                data_part = res_data.get('data', {})
                if data_part:
                    db_log.provider_message_id = data_part.get('smsId') or data_part.get('id')
                    db_log.status = data_part.get('status', 'queued')
                else:
                    db_log.provider_message_id = res_data.get('smsId') or res_data.get('id')
            else:
                db_log.status = "failed"
                db_log.error_log = f"HTTP {response.status_code}: {response.text}"
                print(f"CRITICAL: Textbee Gateway Error: {response.text}")
                
        except Exception as e:
            db_log.status = "failed"
            db_log.error_log = str(e)
            print(f"CRITICAL: Textbee Gateway Exception: {e}")
            
    else:  # Default to Africa's Talking
        try:
            global sms
            if not sms:
                # Lazy initialization if it wasn't set up yet
                africastalking.initialize(settings.at_username, settings.at_api_key)
                sms = africastalking.SMS
                
            # 3. Send the SMS via Africa's Talking
            # Ensure phone_number is in international format (e.g., +2567...)
            response = sms.send(message, [phone_number])
            
            # 4. Parse the Provider Response
            recipients = response.get('SMSMessageData', {}).get('Recipients', [])
            
            if recipients:
                at_data = recipients[0]
                # Update status (e.g., 'Success', 'Sent', 'Buffered')
                db_log.status = at_data.get('status', 'unknown') 
                db_log.provider_message_id = at_data.get('messageId')
                
                # If the provider explicitly returns a 'Failed' status in the JSON
                if db_log.status.lower() in ['failed', 'invalidphonenumber']:
                    db_log.error_log = at_data.get('errorMessage', 'Provider failed to send')
            
        except Exception as e:
            # 5. Handle Network/API Errors
            db_log.status = "failed"
            db_log.error_log = str(e)
            print(f"CRITICAL: Africa's Talking SMS Gateway Exception: {e}")
    
    # 6. Final Commit to update the 'pending' status to 'Success' or 'failed'
    db.commit()
    db.refresh(db_log)
    return db_log