"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginUI() {
  const [email, setemail] = useState("");
  const [password, setpassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleOnclick = async () => {
    try {
      setError(null);

      const request = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await request.json();

      if (!request.ok || !data?.success) {
        throw new Error(data?.message || "Login failed");
      }

      router.push("/dashboard");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed");
      }
    }
  };

  return (
    <div className="flex justify-center items-center max-w-3xl mx-auto mt-20">
      <Card className="p-4">
        <CardHeader>
          <CardTitle className="text-3xl mx-auto p-3">Login </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email :</label>
            <Input
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setemail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password :</label>
            <Input
              value={password}
              onChange={(e) => setpassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-red-500">
              {error}
            </p>
          )}
        </CardContent>
        <Button
          className="w-1/2 m-2 mx-auto"
          size="lg"
          onClick={handleOnclick}
        >
          Login
        </Button>
      </Card>
    </div>
  );
}

