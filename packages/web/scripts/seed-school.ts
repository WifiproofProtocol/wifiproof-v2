/**
 * Creates a fictional, invite-only School pilot after the School migration runs.
 * Run only against the School project with NEXT_PUBLIC_SCHOOL_SUPABASE_URL and
 * SCHOOL_SUPABASE_SECRET_KEY set.
 * New temporary passwords are printed once; no password is stored in this repo.
 */
import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

type SeedRole = "admin" | "lecturer" | "student";

const syntheticUsers: Array<{
  key: string;
  email: string;
  name: string;
  institutionalId: string;
  role: SeedRole;
}> = [
  { key: "admin", email: "admin@aster-academy.example", name: "Mara Okoye", institutionalId: "ADM-001", role: "admin" },
  { key: "lecturer", email: "lecturer@aster-academy.example", name: "Dr. Imani Vale", institutionalId: "LEC-014", role: "lecturer" },
  { key: "student-one", email: "student.one@aster-academy.example", name: "Nia Mensah", institutionalId: "STU-1042", role: "student" },
  { key: "student-two", email: "student.two@aster-academy.example", name: "Leo Kamau", institutionalId: "STU-1057", role: "student" },
];

function env(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function temporaryPassword() {
  return `Wfp!${randomBytes(15).toString("base64url")}`;
}

async function main() {
  const url = env("NEXT_PUBLIC_SCHOOL_SUPABASE_URL");
  const secret = env("SCHOOL_SUPABASE_SECRET_KEY");
  const supabase = createClient(url, secret, { auth: { persistSession: false } });

  const { data: organization, error: organizationError } = await supabase
    .from("school_organizations")
    .upsert({ slug: "aster-academy", name: "Aster Academy", active: true }, { onConflict: "slug" })
    .select("id")
    .single();
  if (organizationError || !organization) throw organizationError ?? new Error("Organization seed failed");

  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  const usersByEmail = new Map(existingUsers.users.map((user) => [user.email?.toLowerCase(), user]));
  const userIds = new Map<string, string>();
  const newCredentials: Array<{ email: string; temporaryPassword: string }> = [];

  for (const seedUser of syntheticUsers) {
    let user = usersByEmail.get(seedUser.email);
    if (!user) {
      const password = temporaryPassword();
      const { data, error } = await supabase.auth.admin.createUser({
        email: seedUser.email,
        password,
        email_confirm: true,
        user_metadata: { synthetic_school_seed: true },
      });
      if (error || !data.user) throw error ?? new Error(`Could not create ${seedUser.email}`);
      user = data.user;
      newCredentials.push({ email: seedUser.email, temporaryPassword: password });
    }
    userIds.set(seedUser.key, user.id);

    const { error: profileError } = await supabase.from("school_profiles").upsert({
      user_id: user.id,
      organization_id: organization.id,
      institutional_id: seedUser.institutionalId,
      display_name: seedUser.name,
      role: seedUser.role,
      active: true,
      must_change_password: true,
    });
    if (profileError) throw profileError;
  }

  const { data: unit, error: unitError } = await supabase
    .from("school_units")
    .upsert(
      { organization_id: organization.id, code: "PRV-201", title: "Privacy Engineering", room: "Signal Lab", active: true },
      { onConflict: "organization_id,code" },
    )
    .select("id")
    .single();
  if (unitError || !unit) throw unitError ?? new Error("Unit seed failed");

  const lecturerId = userIds.get("lecturer");
  const studentOneId = userIds.get("student-one");
  const studentTwoId = userIds.get("student-two");
  if (!lecturerId || !studentOneId || !studentTwoId) throw new Error("Synthetic user IDs are incomplete");

  const { error: lecturerError } = await supabase
    .from("school_unit_lecturers")
    .upsert({ unit_id: unit.id, lecturer_user_id: lecturerId });
  if (lecturerError) throw lecturerError;

  const { error: enrollmentError } = await supabase.from("school_enrollments").upsert([
    { unit_id: unit.id, student_user_id: studentOneId, active: true },
    { unit_id: unit.id, student_user_id: studentTwoId, active: true },
  ]);
  if (enrollmentError) throw enrollmentError;

  const { error: networkError } = await supabase.from("school_networks").upsert(
    {
      organization_id: organization.id,
      label: "Aster Academy demo egress",
      cidrs: ["203.0.113.42/32"],
      active: true,
    },
    { onConflict: "organization_id,label" },
  );
  if (networkError) throw networkError;

  console.log(`Seeded fictional School pilot for ${syntheticUsers.length} accounts.`);
  if (newCredentials.length > 0) {
    console.table(newCredentials);
    console.log("Store these temporary passwords securely; they will not be shown again.");
  } else {
    console.log("All synthetic auth users already existed; no passwords were changed or displayed.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
