import json
import os
from app import models, database

def seed_lessons():
    db = database.SessionLocal()
    seed_path = "seed"
    files = ["lessons_en.json", "lessons_lg.json", "lessons_sw.json"]
    
    total_added = 0
    print("Starting massive seed operation for 400+ lessons...")

    try:
        for file_name in files:
            full_path = os.path.join(seed_path, file_name)
            if not os.path.exists(full_path):
                print(f"Missing: {file_name}")
                continue

            with open(full_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                file_count = 0
                for item in data:
                    # Avoid duplicates by checking the unique lesson code
                    existing = db.query(models.Lesson).filter(models.Lesson.code == item['code'], models.Lesson.language == item.get('language')).first()
                    if not existing:
                        # Extract checklist from content (lines starting with bullets or just first few lines)
                        content_lines = item.get('content', '').split('\n')
                        checklist_items = [line.strip().replace('- ', '').replace('• ', '') for line in content_lines if len(line.strip()) > 5 and 'Media:' not in line and 'Activity:' not in line]
                        # If no suitable lines, use theme-based defaults
                        if not checklist_items:
                            checklist_items = [
                                f"Review {item.get('theme', 'livestock')} safety standards",
                                "Monitor animal behavior daily",
                                "Maintain clean water and feed",
                                "Consult a vet for any abnormalities"
                            ]
                        
                        new_lesson = models.Lesson(
                            code=item.get('code'),
                            title=item.get('title'),
                            topic=item.get('theme') or item.get('module'),
                            content=item.get('content'),
                            language=item.get('language'),
                            theme=item.get('theme'),
                            sms_text=item.get('sms_text') or item.get('sms_content'),
                            checklist=json.dumps(checklist_items[:4])
                        )
                        db.add(new_lesson)
                        file_count += 1
                        total_added += 1
                    else:
                        # Update checklist for existing lessons
                        content_lines = item.get('content', '').split('\n')
                        checklist_items = [line.strip().replace('- ', '').replace('• ', '') for line in content_lines if len(line.strip()) > 5 and 'Media:' not in line and 'Activity:' not in line]
                        if not checklist_items:
                             checklist_items = [
                                f"Review {item.get('theme', 'livestock')} safety standards",
                                "Monitor animal behavior daily",
                                "Maintain clean water and feed",
                                "Consult a vet for any abnormalities"
                            ]
                        existing.checklist = json.dumps(checklist_items[:4])
                        file_count += 1
                        total_added += 1
                print(f"Loaded {file_count} lessons from {file_name}")
            
        db.commit()
        print(f"SUCCESS: {total_added} new lessons added to the database.")
    except Exception as e:
        print(f"Error: {e}")

        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_lessons()
