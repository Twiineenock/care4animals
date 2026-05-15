import africastalking
from ..config import settings
from sqlalchemy.orm import Session
from ..models import SMSLog

# 1. Initialize Africa's Talking using Pydantic Settings
# This is more robust than os.getenv
africastalking.initialize(settings.at_username, settings.at_api_key)
sms = africastalking.SMS

def send_and_log_sms(db: Session, user_id: int, phone_number: str, message: str):
    """
    Sends an SMS and logs the result in the database.
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

    try:
        # 3. Send the SMS via Africa's Talking
        # Ensure phone_number is in international format (e.g., +2567...)
        response = sms.send(message, [phone_number])
        
        # 4. Parse the Provider Response
        # Africa's Talking returns a nested dictionary with recipient details
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
        print(f"CRITICAL: SMS Gateway Exception: {e}")
    
    # 6. Final Commit to update the 'pending' status to 'Success' or 'failed'
    db.commit()
    db.refresh(db_log)
    return db_log