"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link  from "next/link"

export default function Dashboard() {

  return(
    <div>
    <main>
      <div className="relative w-full min-h-screen bg-[#0d0d12] overflow-hidden flex flex-col items-center pt-20">

        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[60%] rounded-full bg-[#361c3b] blur-3xl opacity-70 pointer-events-none"></div>

        <div className="absolute top-[5%] -right-[10%] w-[40%] h-[60%] rounded-full bg-[#112338] blur-3xl opacity-60 pointer-events-none"></div>
          

          <div className="relative z-10 flex flex-col items-center w-full max-w-5xl px-6 text-center mt-12">
            <h1 className="text-white text-6xl font-serif mb-4 -tracking-tight">
              Optimize your code<br />using AI agents
            </h1>
            <h3 className="text-gray-400 text-lg max-w-lg mb-12 text-center">
              AI agents are a new way to optimize your code. They are a way to automate the process of optimizing your code.
            </h3>
          </div>

        <div className="z-20 flex gap-3">
            <Link href="/dashboard">
              <Button size="lg" className="shadow-2xl h-12 px-8 text-lg leading-none cursor-pointer">
                Get Started
              </Button>
            </Link>
        </div>
      </div>
    </main>
  </div>
  )
}