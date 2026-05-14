import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function signToken(payload: {
  id: string;
  email: string;
  name: string;
  onboarded: boolean;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(
  token: string
): Promise<{ id: string; email: string; name: string; onboarded: boolean } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { id: string; email: string; name: string; onboarded: boolean };
  } catch {
    return null;
  }
}
