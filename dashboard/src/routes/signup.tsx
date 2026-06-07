import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell } from "./login";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — Vigil" },
      { name: "description", content: "Create a Vigil account and verify every critical decision before it ships." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => navigate({ to: "/dashboard" }), 800);
  };

  return (
    <AuthShell
      mode="signup"
      onSubmit={onSubmit}
      loading={loading}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      name={name}
      setName={setName}
    />
  );
}
