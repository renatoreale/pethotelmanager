import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import landingLogo from "@/assets/pethotelmanager_landing_logo.png";

const TITLE = "Blog | Guide per chi gestisce una pensione per cani e gatti | Pet Hotel Manager";
const DESCRIPTION = "Guide pratiche su gestione, organizzazione e costi di una pensione per cani e gatti — scritte da chi il settore lo conosce davvero.";
const URL = "https://pethotelmanager.com/blog";

const POSTS = [
  {
    slug: "aprire-pensione-cani-gatti",
    title: "Come aprire una pensione per cani e gatti: la checklist completa",
    description: "Dalla valutazione del mercato alle autorizzazioni, dallo spazio necessario alla scelta degli strumenti giusti fin da subito.",
    date: "6 agosto 2026",
  },
  {
    slug: "quanto-costa-gestire-pensione-animali",
    title: "Quanto costa gestire una pensione per cani e gatti: guida ai costi",
    description: "Le voci di costo reali — fisse, variabili, personale e costi nascosti — e come ridurle senza abbassare la qualità del servizio.",
    date: "6 agosto 2026",
  },
  {
    slug: "overbooking-pensione-animali",
    title: "Overbooking in pensione per cani e gatti: come evitarlo per sempre",
    description: "Perché succede l'overbooking, i 5 errori più comuni che lo causano e la checklist pratica per non farlo mai più.",
    date: "6 agosto 2026",
  },
];

export default function Blog() {
  useEffect(() => {
    const prevTitle = document.title;
    const prevDesc = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    const prevCanonical = canonicalEl?.getAttribute("href") ?? "";

    document.title = TITLE;
    document.querySelector('meta[name="description"]')?.setAttribute("content", DESCRIPTION);
    canonicalEl?.setAttribute("href", URL);

    return () => {
      document.title = prevTitle;
      document.querySelector('meta[name="description"]')?.setAttribute("content", prevDesc);
      canonicalEl?.setAttribute("href", prevCanonical);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2">
            <img src={landingLogo} alt="Pet Hotel Manager" className="h-9 w-auto object-contain" />
          </Link>
          <Link to="/register-trial">
            <Button size="sm">Prova Gratis <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3">
          Blog
        </h1>
        <p className="text-muted-foreground text-lg mb-12 max-w-2xl">
          Guide pratiche su gestione, organizzazione e costi di una pensione per cani e gatti.
        </p>

        <div className="grid gap-6 max-w-2xl">
          {POSTS.map((post) => (
            <Link key={post.slug} to={`/blog/${post.slug}`}>
              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader>
                  <CardDescription>{post.date}</CardDescription>
                  <CardTitle className="text-xl font-serif">{post.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{post.description}</p>
                  <span className="inline-flex items-center gap-1.5 text-primary text-sm font-medium mt-4">
                    Leggi l'articolo <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <footer className="border-t py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>Pet Hotel Manager © {new Date().getFullYear()}</span>
          <div className="flex items-center gap-6">
            <Link to="/landing" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/termini" className="hover:text-foreground transition-colors">Termini</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
