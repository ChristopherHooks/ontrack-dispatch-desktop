# OnTrack Dispatch Desktop App — Project Map

This document provides a high-level overview of the repository so AI agents can quickly understand the system architecture without scanning the entire codebase.

AI assistants must read this file at the start of each session.

---

# Purpose of the Application

OnTrack Dispatch Desktop is an internal operations platform for a trucking dispatch company.

The software replaces spreadsheets and manual workflows with a structured system for:

• Lead acquisition  
• Driver onboarding  
• Load management  
• Broker tracking  
• Task management  
• Invoice tracking  
• Dispatch analytics

Primary workflow:

Lead → Driver → Load → Invoice

---

# Technology Stack

Desktop App Framework
Electron

Frontend
React + TypeScript

Build System
Vite (electron-vite)

Styling
TailwindCSS

State Management
Zustand

Database
SQLite (local desktop storage)

Architecture
IPC bridge between Renderer and Main process

---

# Repository Structure

Root folders:
