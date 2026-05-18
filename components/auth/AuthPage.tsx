"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Alert, Button, Input, Label, Tabs, TextField } from "@heroui/react";
import Logo from "@/components/elements/Logo";
import LemniscateLoader from "@/components/layouts/Loader";
import PasswordField from "@/components/elements/PasswordField";
import Image from "next/image";
import { illustrations } from "@/constants/images";
import { cn } from "@/lib/utils";
const WalletConnectButton = dynamic(
  () => import("@/components/elements/WalletConnectButton"),
  { ssr: false },
);

interface ImageColumnProps {
  heading: React.ReactNode;
  tagline: string;
  /** Pass an img src to replace the placeholder gradient background */
  src?: string;
  isRegister?: boolean;
}

type AuthTab = "login" | "register";

function ImageColumn({ heading, tagline, src, isRegister }: ImageColumnProps) {
  return (
    <div
      className={cn("relative shrink-0 flex p-8", isRegister ? "pr-0" : "pl-0")}
      style={{ width: "50vw", minHeight: "100dvh" }}
    >
      <div className="relative flex-1 rounded-3xl overflow-hidden bg-surface border">
        {src && (
          <Image
            src={src}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            fill
          />
        )}

        <div className="absolute inset-0 bg-linear-to-b from-black/10 via-transparent to-black/90" />

        <div className="absolute top-10 left-10 z-10">
          <Logo className="[&_h1]:text-white!" />
        </div>

        <div className="absolute bottom-12 left-10 right-10 z-10">
          <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
            {heading}
          </h2>
          <p className="text-white/65 text-base leading-relaxed">{tagline}</p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage({ defaultTab }: { defaultTab: AuthTab }) {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>(defaultTab);
  const isRegister = tab === "register";

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginPending, setLoginPending] = useState(false);

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [regPending, setRegPending] = useState(false);

  const isPending = loginPending || regPending;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Login failed. Please try again.");
        return;
      }
      router.push(
        data.teachSkill && data.learnSkill ? "/dashboard" : "/onboarding",
      );
    } catch {
      setLoginError("Something went wrong. Please try again.");
    } finally {
      setLoginPending(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError("");
    setRegPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || "Registration failed. Please try again.");
        return;
      }
      router.push("/onboarding");
    } catch {
      setRegError("Something went wrong. Please try again.");
    } finally {
      setRegPending(false);
    }
  }

  const formColumn = (
    <div className="w-full max-w-sm mx-auto">
      <Tabs
        selectedKey={tab}
        onSelectionChange={(key) => {
          const next = key as AuthTab;
          setTab(next);
          window.history.replaceState(null, "", next === "register" ? "/register" : "/login");
        }}
        className="w-full"
      >
        <Tabs.ListContainer className="flex justify-center mb-8">
          <Tabs.List
            aria-label="Authentication options"
            className="bg-surface border border-border rounded-full p-1 w-fit *:rounded-full *:px-6 *:text-sm *:font-medium *:data-[selected=true]:text-accent-foreground"
          >
            <Tabs.Tab id="register" className="whitespace-nowrap">
              Sign Up
              <Tabs.Indicator className="bg-accent rounded-full" />
            </Tabs.Tab>
            <Tabs.Tab id="login" className="whitespace-nowrap">
              Log In
              <Tabs.Indicator className="bg-accent rounded-full" />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="register" className="flex flex-col gap-5">
          <h1 className="text-2xl font-bold text-foreground text-center">
            Create An Account
          </h1>
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <TextField
              name="name"
              type="text"
              value={regName}
              onChange={setRegName}
              isRequired
              className="w-full"
            >
              <Label>Full Name</Label>
              <Input placeholder="Your name" className="bg-surface" />
            </TextField>
            <TextField
              name="email"
              type="email"
              value={regEmail}
              onChange={setRegEmail}
              isRequired
              className="w-full"
            >
              <Label>Email</Label>
              <Input
                placeholder="you@example.com"
                className="bg-surface"
              />
            </TextField>
            <PasswordField
              value={regPassword}
              onChange={setRegPassword}
              isRequired
              minLength={8}
            />
            {regError && (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{regError}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}
            <Button
              type="submit"
              isPending={regPending}
              className="w-full rounded-full bg-accent text-accent-foreground font-semibold"
            >
              {regPending ? "Creating account…" : "Create Account"}
            </Button>
          </form>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <WalletConnectButton mode="register" />
        </Tabs.Panel>

        <Tabs.Panel id="login" className="flex flex-col gap-5">
          <h1 className="text-2xl font-bold text-foreground text-center">
            Welcome Back
          </h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <TextField
              name="email"
              type="email"
              value={loginEmail}
              onChange={setLoginEmail}
              isRequired
              className="w-full"
            >
              <Label>Email</Label>
              <Input
                placeholder="you@example.com"
                className="bg-surface"
              />
            </TextField>
            <PasswordField
              value={loginPassword}
              onChange={setLoginPassword}
              isRequired
            />
            {loginError && (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{loginError}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}
            <Button
              type="submit"
              isPending={loginPending}
              className="w-full rounded-full bg-accent text-accent-foreground font-semibold"
            >
              {loginPending ? "Signing in…" : "Sign In"}
            </Button>
          </form>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <WalletConnectButton mode="login" />
        </Tabs.Panel>
      </Tabs>
    </div>
  );

  return (
    <>
      <LemniscateLoader
        loading={isPending}
        text={loginPending ? "Signing in…" : "Creating account…"}
        overlayOpacity={1}
      />

      {/* ── Desktop: 3-column sliding track ── */}
      <div className="hidden lg:block relative w-screen min-h-dvh overflow-hidden">
        {/*
          Three columns laid out in a 150vw strip:
          [Register Image 50vw][Form 50vw][Login Image 50vw]

          Register view → x = 0      → shows columns 1 & 2
          Login view    → x = -33.3% → shows columns 2 & 3  (33.3% of 150vw = 50vw)
        */}
        <motion.div
          className="flex bg-white dark:bg-background"
          style={{ width: "150vw", minHeight: "100dvh" }}
          animate={{ x: isRegister ? "0%" : "-33.3333%" }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
        >
          {/* Register Image Column */}
          <ImageColumn
            heading={
              <>
                Trade Skills,
                <br />
                Grow Together.
              </>
            }
            tagline="Connect with experts worldwide, share what you know, and unlock new possibilities."
            src={illustrations.RegisterDark}
            isRegister
          />

          {/* Form Column */}
          <div
            className="shrink-0 flex items-center justify-center px-10 py-12"
            style={{ width: "50vw", minHeight: "100dvh" }}
          >
            {formColumn}
          </div>

          {/* Login Image Column */}
          <ImageColumn
            heading={
              <>
                Your Skills,
                <br />
                Your Currency.
              </>
            }
            tagline="Every skill you share opens a door to something new."
            src={illustrations.LoginDark}
          />
        </motion.div>
      </div>

      {/* ── Mobile: form only ── */}
      <div className="lg:hidden min-h-dvh flex flex-col bg-background">
        <div className="flex justify-center pt-10 pb-2">
          <Logo />
        </div>
        <div className="flex-1 flex items-center justify-center px-5 py-8">
          {formColumn}
        </div>
      </div>
    </>
  );
}
