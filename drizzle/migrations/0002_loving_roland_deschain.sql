CREATE TABLE "features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"feature_id" text NOT NULL,
	"claim" text NOT NULL,
	"requirement" text NOT NULL,
	"verification_hint" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "features" ADD CONSTRAINT "features_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "features_repository_id_idx" ON "features" USING btree ("repository_id");