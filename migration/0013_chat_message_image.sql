-- 0013_chat_message_image.sql
-- Vision messages: user can attach an image URL (Cloudinary) to a chat
-- message. The URL is included in the prompt sent to Groq's vision model.
-- Idempotent.

ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS image_url TEXT;
