function getRequiredValue(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getPublicEnv() {
  return {
    supabaseUrl: getRequiredValue("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: getRequiredValue("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    cloudinaryCloudName: getRequiredValue("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"),
  };
}