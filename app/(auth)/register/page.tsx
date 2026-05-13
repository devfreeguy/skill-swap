"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button, Card, Input, Label, TextField } from "@heroui/react";
import Logo from "@/components/elements/Logo";
import { fadeUp, stagger } from "@/lib/animations";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsPending(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-background px-4 py-16">
      <motion.div
        className="w-full max-w-sm"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp} className="flex justify-center mb-8">
          <Logo />
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="border border-border p-8 gap-6">
            <div className="flex flex-col gap-1 text-center">
              <h1 className="text-2xl font-bold text-foreground">
                Create an account
              </h1>
              <p className="text-sm text-muted">Start trading skills today</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <TextField
                name="name"
                type="text"
                value={name}
                onChange={setName}
                isRequired
                className="w-full"
              >
                <Label>Full Name</Label>
                <Input placeholder="Your name" className="bg-background" />
              </TextField>

              <TextField
                name="email"
                type="email"
                value={email}
                onChange={setEmail}
                isRequired
                className="w-full"
              >
                <Label>Email</Label>
                <Input placeholder="you@example.com" className="bg-background" />
              </TextField>

              <TextField
                name="password"
                type="password"
                value={password}
                onChange={setPassword}
                isRequired
                minLength={8}
                className="w-full"
              >
                <Label>Password</Label>
                <Input placeholder="••••••••" className="bg-background" />
              </TextField>

              {error && (
                <p className="text-sm text-[--danger] text-center">{error}</p>
              )}

              <Button
                type="submit"
                isPending={isPending}
                className="w-full rounded-full bg-accent text-accent-foreground font-semibold mt-2"
              >
                {isPending ? "Creating account…" : "Create Account"}
              </Button>
            </form>

            <p className="text-sm text-muted text-center">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-accent hover:underline font-medium"
              >
                Sign in
              </Link>
            </p>
          </Card>
        </motion.div>
      </motion.div>
    </main>
  );
}
