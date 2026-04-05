import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body || {};

    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { success: false, message: "Email and password must be provided" },
        { status: 400 }
      );
    }


    if (email == "tej@mail" && password == "12345") {
      return NextResponse.json(
        { success: true,  message: "Login Successful" },
        { status: 200 }
      );
    }

    // // In a real app you would set a session / JWT cookie here.
    // return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("Login API error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

