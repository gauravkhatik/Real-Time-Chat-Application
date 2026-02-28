import { SignUp } from "@clerk/nextjs";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up - Real-Time Chat App",
  description: "Create a new chat account",
};

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md">
        <SignUp
          appearance={{
            elements: {
              rootBox:
                "mx-auto bg-card rounded-lg border border-border p-6 shadow-lg",
              card: "bg-card",
              main: "bg-card",
              headerTitle: "text-foreground font-bold",
              headerSubtitle: "text-muted-foreground",
              formFieldLabel: "text-foreground",
              formFieldInput: "bg-input border-input text-foreground",
              formButtonPrimary:
                "bg-primary text-primary-foreground hover:bg-primary/90",
              footerActionLink: "text-primary hover:text-primary/80",
              footerActionText: "text-muted-foreground",
              dividerText: "text-muted-foreground",
              socialButtonsBlockButton: "border-border bg-card text-foreground hover:bg-accent",
              identifierInputField: "bg-input border-input text-foreground",
            },
          }}
        />
      </div>
    </div>
  );
}
