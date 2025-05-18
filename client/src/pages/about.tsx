import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Cloud, 
  Users,
  Shield,
  Code,
  Star
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
      {/* Navigation */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cloud className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">S3 Manager</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/">
              <a className="text-foreground/80 hover:text-foreground transition-colors">Home</a>
            </Link>
            <Link href="/about">
              <a className="text-foreground/80 hover:text-foreground font-medium transition-colors">About</a>
            </Link>
            <Link href="/contact">
              <a className="text-foreground/80 hover:text-foreground transition-colors">Contact</a>
            </Link>
            <Link href="/auth">
              <Button>
                Login / Register <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="md:hidden">
            <Button variant="ghost" size="icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-menu"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero section */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">About S3 Manager</h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Learn about our mission to simplify Amazon S3 management
            and the team behind the application.
          </p>
        </div>
      </section>
      
      {/* Our Story section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Our Story</h2>
          <div className="prose prose-lg max-w-none dark:prose-invert">
            <p>
              S3 Manager was born out of a simple frustration: managing Amazon S3 buckets and files across multiple accounts was unnecessarily complex and time-consuming.
            </p>
            
            <p>
              In 2022, our team of cloud infrastructure specialists set out to create a solution that would simplify S3 management for teams of all sizes. We wanted to build an application that would not only make day-to-day operations more efficient but also provide advanced features for secure file sharing and collaboration.
            </p>
            
            <p>
              After months of development and testing with early adopters, we launched S3 Manager with a core set of features focused on multi-account management, batch operations, and secure file sharing. Since then, we've continuously improved the platform based on user feedback, adding new capabilities while maintaining a clean, intuitive interface.
            </p>
            
            <p>
              Today, S3 Manager is used by thousands of developers, IT administrators, and content managers worldwide to streamline their cloud storage workflows.
            </p>
          </div>
        </div>
      </section>
      
      {/* Our Values section */}
      <section className="bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">Our Values</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Security First</h3>
                <p className="text-muted-foreground">
                  We prioritize the security of your data in everything we build, following industry best practices and standards.
                </p>
              </div>
              
              <div className="text-center">
                <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Code className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Continuous Innovation</h3>
                <p className="text-muted-foreground">
                  We're committed to continuously improving our platform with new features and optimizations.
                </p>
              </div>
              
              <div className="text-center">
                <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">User-Centered Design</h3>
                <p className="text-muted-foreground">
                  We design our features with user feedback and real-world use cases at the forefront.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Team section */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-10 text-center">Our Team</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card rounded-lg p-6 text-center border">
              <div className="h-24 w-24 bg-secondary/40 rounded-full mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold mb-1">Alex Johnson</h3>
              <p className="text-primary text-sm mb-3">Co-Founder & CEO</p>
              <p className="text-muted-foreground text-sm">
                Cloud infrastructure specialist with 10+ years experience in AWS services.
              </p>
            </div>
            
            <div className="bg-card rounded-lg p-6 text-center border">
              <div className="h-24 w-24 bg-secondary/40 rounded-full mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold mb-1">Sarah Martinez</h3>
              <p className="text-primary text-sm mb-3">Co-Founder & CTO</p>
              <p className="text-muted-foreground text-sm">
                Full-stack developer specializing in web applications and distributed systems.
              </p>
            </div>
            
            <div className="bg-card rounded-lg p-6 text-center border">
              <div className="h-24 w-24 bg-secondary/40 rounded-full mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold mb-1">Michael Chen</h3>
              <p className="text-primary text-sm mb-3">Head of Product</p>
              <p className="text-muted-foreground text-sm">
                Product strategist with a background in UX design and user research.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA section */}
      <section className="container mx-auto px-4 py-12 md:py-16 mb-8">
        <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl p-8 md:p-12">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              Join us in simplifying S3 management
            </h2>
            <p className="text-lg mb-8">
              Experience the difference of a purpose-built S3 client designed for efficiency and collaboration.
            </p>
            <Link href="/auth">
              <Button size="lg" className="px-8">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Cloud className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">S3 Manager</span>
              </div>
              <p className="text-muted-foreground mb-4">
                A comprehensive web-based Amazon S3 client for efficient file management.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link href="/features"><a className="text-muted-foreground hover:text-foreground transition-colors">Features</a></Link></li>
                <li><Link href="/pricing"><a className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a></Link></li>
                <li><Link href="/documentation"><a className="text-muted-foreground hover:text-foreground transition-colors">Documentation</a></Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link href="/about"><a className="text-muted-foreground hover:text-foreground transition-colors">About Us</a></Link></li>
                <li><Link href="/contact"><a className="text-muted-foreground hover:text-foreground transition-colors">Contact</a></Link></li>
                <li><Link href="/careers"><a className="text-muted-foreground hover:text-foreground transition-colors">Careers</a></Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="/privacy"><a className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a></Link></li>
                <li><Link href="/terms"><a className="text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a></Link></li>
                <li><Link href="/security"><a className="text-muted-foreground hover:text-foreground transition-colors">Security</a></Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-12 pt-8 text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} S3 Manager. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}