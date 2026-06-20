CREATE TABLE "admin_settings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "updated_by" UUID,

  CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_settings_key_key" ON "admin_settings"("key");
CREATE INDEX "admin_settings_updated_by_idx" ON "admin_settings"("updated_by");

ALTER TABLE "admin_settings"
  ADD CONSTRAINT "admin_settings_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
