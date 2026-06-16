import { createClient } from "../supabase/server";
import { nanoid } from "nanoid";

// Helper function to hash password (simple base64 for now, should use bcrypt in production)
const hashPassword = (password: string) => {
  return btoa(password);
};

// Helper function to verify password
const verifyPassword = (password: string, hash: string) => {
  return btoa(password) === hash;
};

// Helper function to generate session token
const generateSessionToken = () => {
  return nanoid(32);
};

export async function signup(data: {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}) {
  const supabase = createClient();

  // Validate input
  if (!data.name || !data.email || !data.password) {
    return { error: "Please fill all fields" };
  }

  if (data.password.length < 6) {
    return { error: "Password needs 6+ characters" };
  }

  if (!/^[^@]+@[^@]+\.[^@]+$/.test(data.email)) {
    return { error: "Invalid email address" };
  }

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("email")
    .eq("email", data.email.toLowerCase())
    .single();

  if (existingUser) {
    return { error: "Email already registered" };
  }

  // Create user
  const passwordHash = hashPassword(data.password);
  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({
      email: data.email.toLowerCase(),
      name: data.name,
      password_hash: passwordHash,
      avatar: data.avatar || "🐱",
    })
    .select()
    .single();

  if (insertError) {
    return { error: "Failed to create account" };
  }

  // Create user stats
  await supabase.from("user_stats").insert({
    user_id: newUser.id,
    cards_created: 0,
    cards_sent: 0,
    smiles_received: 0,
  });

  // Create session
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await supabase.from("sessions").insert({
    user_id: newUser.id,
    token: sessionToken,
    expires_at: expiresAt.toISOString(),
  });

  return {
    success: true,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      avatar: newUser.avatar,
    },
    sessionToken,
  };
}

export async function login(data: {
  email: string;
  password: string;
}) {
  const supabase = createClient();

  // Validate input
  if (!data.email || !data.password) {
    return { error: "Please fill all fields" };
  }

  // Get user
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("email", data.email.toLowerCase())
    .single();

  if (userError || !user) {
    return { error: "Invalid email or password" };
  }

  // Verify password
  if (!verifyPassword(data.password, user.password_hash)) {
    return { error: "Invalid email or password" };
  }

  // Create session
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await supabase.from("sessions").insert({
    user_id: user.id,
    token: sessionToken,
    expires_at: expiresAt.toISOString(),
  });

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    },
    sessionToken,
  };
}

export async function logout(sessionToken: string) {
  const supabase = createClient();

  // Delete session
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("token", sessionToken);

  if (error) {
    return { error: "Failed to logout" };
  }

  return { success: true };
}

export async function getSession(sessionToken: string) {
  const supabase = createClient();

  // Get session
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select(
      `
      *,
      users (
        id,
        email,
        name,
        avatar
      )
    `
    )
    .eq("token", sessionToken)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (sessionError || !session) {
    return null;
  }

  return {
    user: session.users,
    expiresAt: session.expires_at,
  };
}

export async function verifySession(sessionToken: string) {
  const session = await getSession(sessionToken);
  return session !== null;
}
