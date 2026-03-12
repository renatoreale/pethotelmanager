import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const CAT_BREEDS = [
  "Abissino", "American Curl", "American Shorthair", "Angora Turco", "Balinese",
  "Bengala", "Birmano", "Blu di Russia", "Bombay", "British Longhair",
  "British Shorthair", "Burmese", "Burmilla", "Certosino", "Cornish Rex",
  "Devon Rex", "Europeo", "Exotic Shorthair", "Himalayano", "Maine Coon",
  "Manx", "Mau Egiziano", "Munchkin", "Norvegese delle Foreste", "Ocicat",
  "Orientale", "Persiano", "Peterbald", "Ragamuffin", "Ragdoll",
  "Sacro di Birmania", "Savannah", "Scottish Fold", "Siamese", "Siberiano",
  "Singapura", "Snowshoe", "Somalo", "Sphynx", "Thai",
  "Tonkinese", "Turkish Van", "Meticcio",
];

const DOG_BREEDS = [
  "Akita Inu", "Alano", "Australian Shepherd", "Barboncino", "Bassotto",
  "Beagle", "Bernese Mountain Dog", "Bichon Frisé", "Border Collie", "Boston Terrier",
  "Boxer", "Bracco Italiano", "Bulldog Francese", "Bulldog Inglese", "Bull Terrier",
  "Cane Corso", "Cavalier King Charles", "Chihuahua", "Chow Chow", "Cocker Spaniel",
  "Collie", "Dalmata", "Dobermann", "Dogo Argentino", "Epagneul Breton",
  "Golden Retriever", "Husky Siberiano", "Jack Russell Terrier", "Labrador Retriever", "Levriero",
  "Maltese", "Malinois", "Maremmano Abruzzese", "Pastore Australiano", "Pastore Tedesco",
  "Pechinese", "Pinscher Nano", "Pitbull", "Pointer", "Pomerania",
  "Rottweiler", "San Bernardo", "Schnauzer", "Setter Inglese", "Setter Irlandese",
  "Shiba Inu", "Shih Tzu", "Springer Spaniel", "Terranova", "Volpino Italiano",
  "Weimaraner", "West Highland White Terrier", "Whippet", "Yorkshire Terrier", "Meticcio",
];

interface BreedComboboxProps {
  value: string;
  onChange: (value: string) => void;
  petType?: string;
  placeholder?: string;
  className?: string;
}

export function BreedCombobox({ value, onChange, petType, placeholder = "Razza...", className }: BreedComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const breeds = petType === "cani" ? DOG_BREEDS : petType === "gatti" ? CAT_BREEDS : [...CAT_BREEDS, ...DOG_BREEDS].sort();
  
  const filtered = search
    ? breeds.filter((b) => b.toLowerCase().includes(search.toLowerCase()))
    : breeds;

  const handleSelect = (breed: string) => {
    onChange(breed);
    setSearch(breed);
    setOpen(false);
  };

  const handleInputChange = (val: string) => {
    setSearch(val);
    onChange(val);
    if (!open) setOpen(true);
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <Input
        value={search}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ScrollArea className="max-h-48">
            <div className="p-1">
              {filtered.map((breed) => (
                <button
                  key={breed}
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer",
                    breed === value && "bg-accent text-accent-foreground font-medium"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(breed);
                  }}
                >
                  {breed}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
