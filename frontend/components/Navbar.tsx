"use client";

import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-transparent shadow-2xl  backdrop-blur-lg p-4 rounded  w-[90%] max-w-4xl z-50">
      <div className="container mx-auto flex justify-between items-center">
        {/* Left - Logo */}
        <Link href="/" className="text-white text-2xl font-bold">
          VercelClone
        </Link>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-white md:hidden"
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* Navigation Links */}
        <div
          className={`${
            isOpen ? "block" : "hidden"
          } md:flex md:space-x-8 absolute md:static top-16 left-0 right-0 bg-black md:bg-transparent p-4 md:p-0 text-white rounded-b-lg md:rounded-none shadow-lg md:shadow-none z-10`}
        >
          <Link href="#" className="block py-2 md:py-0 hover:text-gray-400">
            Home
          </Link>
          <Link href="#" className="block py-2 md:py-0 hover:text-gray-400">
            About
          </Link>
          <Link href="#" className="block py-2 md:py-0 hover:text-gray-400">
            Services
          </Link>
          <Link href="#" className="block py-2 md:py-0 hover:text-gray-400">
            Contact
          </Link>
        </div>
      </div>
    </nav>
  );
}
