-- Add structured assistant choice interactions and user choice responses.
ALTER TABLE "Message" ADD COLUMN "interaction" JSONB;
ALTER TABLE "Message" ADD COLUMN "choiceResponse" JSONB;
