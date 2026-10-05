-- Deduplicate per user: two users uploading the same file get separate documents.
DROP INDEX "documents_checksum_key";
CREATE UNIQUE INDEX "documents_user_id_checksum_key" ON "documents"("user_id", "checksum");
