import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  BookOpen, 
  MessageSquare, 
  MessageCircle,
  X, 
  Send, 
  Moon, 
  Sun, 
  ChevronRight, 
  ArrowLeft,
  Activity,
  Bone,
  Stethoscope,
  Info,
  Menu,
  Sparkles
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI } from "@google/genai";
import diseasesData from './data/diseases.json';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface Disease {
  id: string;
  name: string;
  category: string;
  etiology: string;
  pathophysiology: string;
  symptoms: string[];
  epidemiology?: string;
  diagnosis?: string;
  treatment?: string;
  prognosis?: string;
  sources?: string[];
}

interface Message {
  role: 'user' | 'bot';
  content: string;
}

// AI Initialization
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

function getLevenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export default function App() {
  const [currentView, setCurrentView] = useState<'lobby' | 'detail'>('lobby');
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDiagnosisOpen, setIsDiagnosisOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const [activeTooltip, setActiveTooltip] = useState<'diagnosis' | 'chatbot' | 'none'>('diagnosis');

  useEffect(() => {
    if (activeTooltip === 'diagnosis') {
      const timer = setTimeout(() => setActiveTooltip('chatbot'), 7500);
      return () => clearTimeout(timer);
    } else if (activeTooltip === 'chatbot') {
      const timer = setTimeout(() => setActiveTooltip('none'), 4000);
      return () => clearTimeout(timer);
    }
  }, [activeTooltip]);

  // Initial loading simulation
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Handle navigation
  const navigateToDetail = (disease: Disease) => {
    setSelectedDisease(disease);
    setCurrentView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToLobby = () => {
    setCurrentView('lobby');
    setSelectedDisease(null);
    setSearchInput('');
    setSearchQuery('');
    setSuggestion(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = () => {
    const query = searchInput.trim().toLowerCase();
    
    if (query === '') {
      setSearchQuery('');
      setSuggestion(null);
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const exactMatches = diseasesData.filter(d => 
      d.name.toLowerCase().includes(query) ||
      d.category.toLowerCase().includes(query)
    );

    if (exactMatches.length > 0) {
      setSearchQuery(query);
      setSuggestion(null);
    } else {
      let bestMatch = null;
      let minDistance = Infinity;
      
      diseasesData.forEach(d => {
        const name = d.name.toLowerCase();
        const cat = d.category.toLowerCase();
        
        // Check full strings
        const nameDist = getLevenshteinDistance(query, name);
        const catDist = getLevenshteinDistance(query, cat);
        let dist = Math.min(nameDist, catDist);
        let matchStr = dist === nameDist ? d.name : d.category;

        // Check individual words
        const nameWords = name.split(' ');
        const catWords = cat.split(' ');
        
        nameWords.forEach((word, idx) => {
          const wordDist = getLevenshteinDistance(query, word);
          if (wordDist < dist) {
            dist = wordDist;
            matchStr = d.name; // Suggest the full name if a word matches
          }
        });

        catWords.forEach((word, idx) => {
          const wordDist = getLevenshteinDistance(query, word);
          if (wordDist < dist) {
            dist = wordDist;
            matchStr = d.category; // Suggest the full category if a word matches
          }
        });
        
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = matchStr;
        }
      });

      if (minDistance <= 2 && bestMatch) {
        setSuggestion(bestMatch);
        setSearchQuery(query);
      } else {
        setSearchQuery(query);
        setSuggestion(null);
      }
    }
    
    setTimeout(() => {
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSuggestionClick = () => {
    if (suggestion) {
      setSearchInput(suggestion);
      setSearchQuery(suggestion);
      setSuggestion(null);
    }
  };

  // Filter diseases
  const filteredDiseases = diseasesData.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen font-sans selection:bg-copper/30 selection:text-navy overflow-x-hidden">
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[200] bg-navy flex flex-col items-center justify-center space-y-12"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            >
              <LogoIcon className="w-48 h-48 sm:w-56 sm:h-56" />
            </motion.div>
            <div className="space-y-4 text-center">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="text-3xl font-serif font-bold text-paper tracking-[0.2em] uppercase"
              >
                I1 Skeleton Key
              </motion.h2>
              <motion.div 
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 1.2, ease: "easeInOut" }}
                className="h-px w-48 bg-copper/50 mx-auto origin-center"
              />
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 1 }}
                className="text-[10px] uppercase tracking-[0.4em] text-paper/40"
              >
                Accessing Digital Medical Archive
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-navy/90 backdrop-blur-2xl border-b border-paper/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 sm:h-24 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 sm:gap-6 cursor-pointer group" 
            onClick={() => {
              navigateToLobby();
              setSpinCount(prev => prev + 1);
            }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-copper/20 rounded-full blur-lg scale-0 group-hover:scale-150 transition-transform duration-700" />
              <motion.div
                animate={{ rotate: spinCount * 360 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              >
                <LogoIcon className="w-16 h-16 sm:w-20 sm:h-20 relative z-10 group-hover:rotate-12 transition-transform duration-500" />
              </motion.div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-3xl font-serif font-bold tracking-tight text-paper leading-none">
                I1 <span className="text-copper italic font-light">Skeleton Key</span>
              </span>
              <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.3em] text-paper/40 font-bold mt-1">
                Digital Medical Archive
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-10">
            {/* Navigation removed as requested */}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          {currentView === 'lobby' ? (
            <LobbyView 
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              suggestion={suggestion}
              handleSearch={handleSearch}
              handleSuggestionClick={handleSuggestionClick}
              diseases={filteredDiseases}
              onSelect={navigateToDetail}
            />
          ) : (
            <DetailView 
              disease={selectedDisease!}
              onBack={navigateToLobby}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Chatbot Widget */}
      <Chatbot 
        isChatOpen={isChatOpen} 
        setIsChatOpen={(val: boolean) => {
          setIsChatOpen(val);
          if (val) setIsDiagnosisOpen(false);
        }} 
        isOtherOpen={isDiagnosisOpen}
        showTooltip={activeTooltip === 'chatbot'}
        onCloseTooltip={() => setActiveTooltip('none')}
      />

      {/* Diagnosis Widget */}
      <DiagnosisWidget 
        isDiagnosisOpen={isDiagnosisOpen} 
        setIsDiagnosisOpen={(val: boolean) => {
          setIsDiagnosisOpen(val);
          if (val) setIsChatOpen(false);
        }} 
        isOtherOpen={isChatOpen}
        showTooltip={activeTooltip === 'diagnosis'}
        onCloseTooltip={() => setActiveTooltip('none')}
      />

      {/* Footer */}
      <footer className="mt-20 sm:mt-32 border-t border-paper/5 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center space-y-8">
          <div className="flex items-center gap-3">
            <LogoIcon className="w-14 h-14 sm:w-16 sm:h-16" />
            <span className="text-2xl font-serif font-bold text-paper">I1 Skeleton Key</span>
          </div>
          <p className="text-paper/60 max-w-sm leading-relaxed italic font-light">
            A prestigious medical repository dedicated to the advancement of musculoskeletal knowledge.
          </p>
          <div className="pt-8 border-t border-paper/5 w-full flex flex-col items-center gap-4 text-[10px] uppercase tracking-widest text-paper/40">
            <p className="font-bold text-copper">Made by Group I1</p>
            <p>University Presentation Edition • v2.0.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Components ---

function LogoIcon({ className, style }: { className?: string, style?: React.CSSProperties }) {
  return (
    <svg 
      viewBox="0 0 100 115" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3.5" 
      strokeLinecap="square" 
      strokeLinejoin="miter" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-full object-contain text-copper", className)}
      style={style}
    >
      <g transform="translate(0, 5)">
        {/* Star */}
        <path d="M 50 10 Q 50 26 35 26 Q 50 26 50 42 Q 50 26 65 26 Q 50 26 50 10 Z" />
        
        {/* Outer lines */}
        <path d="M 20 78 L 20 26 L 35 26" />
        <path d="M 80 78 L 80 26 L 65 26" />
        
        {/* Curves */}
        <path d="M 50 42 Q 50 54 20 54" />
        <path d="M 50 42 Q 50 54 80 54" />
        
        {/* Inner lines */}
        <path d="M 35 78 L 35 64 L 50 64" />
        <path d="M 65 78 L 65 64 L 50 64" />
        
        {/* Center line */}
        <path d="M 50 78 L 50 42" />
      </g>
      
      <text x="50" y="100" fontFamily="sans-serif" fontSize="8.5" fontWeight="800" textAnchor="middle" letterSpacing="0.15em" fill="currentColor" stroke="none">BADYA UNIVERSITY</text>
      <text x="50" y="110" fontFamily="sans-serif" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="currentColor" stroke="none">جـــامـــعـــة بــــاديــــا</text>
    </svg>
  );
}

function TypewriterText({ text, speed = 20 }: { text: string, speed?: number }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    setDisplayedText("");
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return <>{displayedText}</>;
}

function LobbyView({ searchInput, setSearchInput, suggestion, handleSearch, handleSuggestionClick, diseases, onSelect }: any) {
  const categories = ["Bone Disorders", "Joint Diseases", "Muscle Diseases"];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8 sm:space-y-12"
    >
      {/* Hero Section */}
      <section className="relative py-4 sm:py-6 flex flex-col items-center text-center space-y-4 sm:space-y-6">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-copper/5 rounded-full blur-[30px] sm:blur-[60px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-2 sm:space-y-4"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-4 sm:w-8 bg-copper/30" />
            <span className="text-[6px] sm:text-[8px] uppercase tracking-[0.3em] sm:tracking-[0.4em] text-copper font-bold">The Premier Archive</span>
            <div className="h-px w-4 sm:w-8 bg-copper/30" />
          </div>
          <h1 className="text-2xl sm:text-5xl lg:text-6xl font-serif font-bold text-paper leading-[1.1] sm:leading-[0.95] tracking-tighter px-4">
            Explore the <br />
            <span className="italic text-copper font-light">musculoskeletal diseases</span>
          </h1>
        </motion.div>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 1.2 }}
          className="max-w-lg text-xs sm:text-base text-paper/60 leading-relaxed font-light italic px-6"
        >
          "Unlock the secrets of the human frame. Our curated collection offers unprecedented depth into the pathologies that define our structural existence."
        </motion.p>

        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="w-full max-w-xl px-4 flex gap-2"
        >
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-paper/30 group-focus-within:text-copper transition-colors">
              <Search size={18} />
            </div>
            <input 
              type="text"
              placeholder="Search the archive..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="w-full pl-14 pr-4 py-4 sm:py-6 bg-white/5 border border-paper/5 focus:border-copper/50 outline-none transition-all text-base sm:text-xl font-serif italic text-paper placeholder:text-paper/20 shadow-2xl shadow-navy/5"
            />
          </div>
          <button 
            onClick={handleSearch}
            className="bg-copper text-white px-6 sm:px-8 font-bold tracking-widest uppercase text-xs sm:text-sm hover:bg-copper/90 transition-colors shadow-lg shadow-copper/20"
          >
            Enter
          </button>
        </motion.div>

        <AnimatePresence>
          {suggestion && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm text-paper/60 italic"
            >
              Did you mean: <button onClick={handleSuggestionClick} className="text-copper font-bold hover:underline">{suggestion}</button>?
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Categories / Shelves */}
      <div id="results-section" className="space-y-12 sm:space-y-20">
        {categories.map((cat, idx) => {
          const catDiseases = diseases.filter((d: any) => d.category === cat);
          if (catDiseases.length === 0) return null;

          return (
            <section key={cat} className="space-y-10 sm:space-y-16">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-paper/5 pb-6 sm:pb-8 gap-4">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.4em] text-copper font-bold">Shelf {idx + 1}</span>
                  <div className="h-px w-8 bg-copper/20" />
                </div>
                <h2 className="text-3xl sm:text-5xl font-serif font-bold text-paper">{cat}</h2>
              </div>
              <span className="text-[10px] sm:text-xs font-serif italic text-paper/40 tracking-widest">
                {catDiseases.length} Volumes in Collection
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-12">
              {catDiseases.map((disease: any, dIdx: number) => (
                <motion.div
                  key={disease.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: dIdx * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => onSelect(disease)}
                  className="group relative cursor-pointer"
                >
                  <div className="absolute inset-0 bg-copper/5 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-700 rounded-2xl" />
                  <div className="relative p-8 sm:p-12 space-y-6 sm:space-y-8 border border-transparent group-hover:border-paper/5 transition-all duration-700">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.3em] text-paper/20 font-bold">Record 0{dIdx + 1}</span>
                      <div className="w-8 h-8 rounded-full border border-paper/10 flex items-center justify-center group-hover:border-copper group-hover:bg-copper group-hover:text-white transition-all duration-500">
                        <ChevronRight size={14} />
                      </div>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                      <h3 className="text-2xl sm:text-3xl font-serif font-bold text-paper group-hover:text-copper transition-colors duration-500">{disease.name}</h3>
                      <div className="h-px w-12 bg-copper/30 group-hover:w-full transition-all duration-700" />
                    </div>
                    <p className="text-sm sm:text-base text-paper/50 line-clamp-3 font-light leading-relaxed italic">
                      {disease.etiology}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        );
      })}
      </div>
    </motion.div>
  );
}

function DetailView({ disease, onBack }: { disease: Disease, onBack: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-6xl mx-auto space-y-16 sm:space-y-32"
    >
      <button 
        onClick={onBack}
        className="group flex items-center gap-4 text-[8px] sm:text-[10px] uppercase tracking-[0.5em] text-paper/40 hover:text-copper transition-all font-bold"
      >
        <div className="w-8 h-8 rounded-full border border-paper/10 flex items-center justify-center group-hover:border-copper group-hover:bg-copper group-hover:text-white transition-all">
          <ArrowLeft size={12} />
        </div>
        Return to Archive
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 sm:gap-24">
        <header className="lg:col-span-5 space-y-8 sm:space-y-12 lg:sticky lg:top-32 h-fit">
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.5em] text-copper font-bold">{disease.category}</span>
              <div className="h-px w-12 bg-copper/30" />
            </div>
            <h1 className="text-5xl sm:text-8xl font-serif font-bold text-paper leading-[0.9] tracking-tighter">
              {disease.name}
            </h1>
          </div>
          
          <div className="space-y-6">
            <div className="h-px w-full bg-paper/5" />
            <div className="flex items-center justify-between text-[8px] sm:text-[10px] uppercase tracking-[0.3em] text-paper/40 font-bold">
              <div className="flex items-center gap-3">
                <BookOpen size={14} className="text-copper" />
                <span>Archival Record</span>
              </div>
              <span>#MSK-{disease.id.toUpperCase()}</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-copper/5 border border-copper/10 space-y-4">
            <h4 className="text-[8px] sm:text-[10px] uppercase tracking-widest text-copper font-bold">Librarian's Note</h4>
            <p className="text-xs sm:text-sm text-paper/60 leading-relaxed italic font-light">
              "This entry represents a critical understanding of {disease.category.toLowerCase()}, requiring careful clinical correlation."
            </p>
          </div>
        </header>

        <div className="lg:col-span-7 space-y-20 sm:space-y-32">
          <section className="space-y-6 sm:space-y-8">
            <div className="flex items-center gap-4">
              <span className="text-3xl sm:text-4xl font-serif italic text-copper/20">01</span>
              <h2 className="text-[10px] sm:text-xs uppercase tracking-[0.5em] text-paper/40 font-bold">Etiology</h2>
            </div>
            <p className="text-xl sm:text-2xl font-light leading-relaxed text-paper/80 font-serif italic">
              {disease.etiology}
            </p>
          </section>

          <section className="space-y-6 sm:space-y-8">
            <div className="flex items-center gap-4">
              <span className="text-3xl sm:text-4xl font-serif italic text-copper/20">02</span>
              <h2 className="text-[10px] sm:text-xs uppercase tracking-[0.5em] text-paper/40 font-bold">Pathophysiology</h2>
            </div>
            <p className="text-lg sm:text-xl font-light leading-relaxed text-paper/70">
              {disease.pathophysiology}
            </p>
          </section>

          <section className="space-y-10 sm:space-y-12">
            <div className="flex items-center gap-4">
              <span className="text-3xl sm:text-4xl font-serif italic text-copper/20">03</span>
              <h2 className="text-[10px] sm:text-xs uppercase tracking-[0.5em] text-paper/40 font-bold">Clinical Presentation</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              {disease.symptoms.map((s, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.8 }}
                  className="group p-6 sm:p-8 bg-white/5 border border-paper/5 hover:border-copper/30 transition-all duration-500"
                >
                  <div className="flex items-start gap-4 sm:gap-6">
                    <span className="text-xs font-serif italic text-copper group-hover:scale-110 transition-transform">0{i+1}</span>
                    <p className="text-base sm:text-lg text-paper/70 font-light leading-relaxed">{s}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {disease.epidemiology && (
            <section className="space-y-6 sm:space-y-8">
              <div className="flex items-center gap-4">
                <span className="text-3xl sm:text-4xl font-serif italic text-copper/20">04</span>
                <h2 className="text-[10px] sm:text-xs uppercase tracking-[0.5em] text-paper/40 font-bold">Epidemiology</h2>
              </div>
              <p className="text-lg sm:text-xl font-light leading-relaxed text-paper/70">
                {disease.epidemiology}
              </p>
            </section>
          )}

          {disease.diagnosis && (
            <section className="space-y-6 sm:space-y-8">
              <div className="flex items-center gap-4">
                <span className="text-3xl sm:text-4xl font-serif italic text-copper/20">05</span>
                <h2 className="text-[10px] sm:text-xs uppercase tracking-[0.5em] text-paper/40 font-bold">Diagnosis</h2>
              </div>
              <p className="text-lg sm:text-xl font-light leading-relaxed text-paper/70">
                {disease.diagnosis}
              </p>
            </section>
          )}

          {disease.treatment && (
            <section className="space-y-6 sm:space-y-8">
              <div className="flex items-center gap-4">
                <span className="text-3xl sm:text-4xl font-serif italic text-copper/20">06</span>
                <h2 className="text-[10px] sm:text-xs uppercase tracking-[0.5em] text-paper/40 font-bold">Treatment & Management</h2>
              </div>
              <p className="text-lg sm:text-xl font-light leading-relaxed text-paper/70">
                {disease.treatment}
              </p>
            </section>
          )}

          {disease.prognosis && (
            <section className="space-y-6 sm:space-y-8">
              <div className="flex items-center gap-4">
                <span className="text-3xl sm:text-4xl font-serif italic text-copper/20">07</span>
                <h2 className="text-[10px] sm:text-xs uppercase tracking-[0.5em] text-paper/40 font-bold">Prognosis</h2>
              </div>
              <p className="text-lg sm:text-xl font-light leading-relaxed text-paper/70">
                {disease.prognosis}
              </p>
            </section>
          )}

          {disease.sources && disease.sources.length > 0 && (
            <section className="space-y-6 sm:space-y-8 mt-16 pt-8 border-t border-paper/10">
              <div className="flex items-center gap-4">
                <h2 className="text-[10px] sm:text-xs uppercase tracking-[0.5em] text-paper/40 font-bold">Sources & References</h2>
              </div>
              <ul className="list-disc list-inside text-sm text-paper/50 space-y-2 font-light italic">
                {disease.sources.map((source, idx) => (
                  <li key={idx}>{source}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// --- Diagnosis Widget Component ---

function DiagnosisWidget({ isDiagnosisOpen, setIsDiagnosisOpen, isOtherOpen, showTooltip, onCloseTooltip }: any) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [queuePos, setQueuePos] = useState<number | null>(null);
  const [estTime, setEstTime] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    area: "",
    duration: "",
    painType: "",
    description: ""
  });

  const handleDiagnose = async () => {
    setLoading(true);
    setStep(2);

    const queueDelay = new Promise<void>(resolve => {
      let q = Math.floor(Math.random() * 3) + 2;
      let t = q * 1.5;
      setQueuePos(q);
      setEstTime(Math.ceil(t));
      
      const intv = setInterval(() => {
        q -= 1;
        t -= 1.5;
        if (q > 0) {
          setQueuePos(q);
          setEstTime(Math.ceil(t));
        } else {
          setQueuePos(0);
          setEstTime(0);
          clearInterval(intv);
          resolve();
        }
      }, 1500);
    });

    try {
      const prompt = `You are a musculoskeletal diagnostic assistant. Based on the following patient inputs, provide a potential diagnosis and next steps. Format your response EXACTLY as follows, with NO markdown formatting (no asterisks, no bolding) and NO extra text. It MUST be a maximum of 4 lines total.
Line 1: [Potential Diagnosis or 'Normal Strain']
Line 2: [What to do next]

Area: ${formData.area}
Duration: ${formData.duration}
Pain Type: ${formData.painType}
Description: ${formData.description}`;

      const [response] = await Promise.all([
        genAI.models.generateContent({ 
          model: "gemini-3.1-flash-lite-preview",
          contents: prompt
        }),
        queueDelay
      ]);

      setResult(response.text || "Unable to determine diagnosis.");
    } catch (error) {
      setResult("Error processing diagnosis. Please try again.");
    } finally {
      setLoading(false);
      setQueuePos(null);
      setEstTime(null);
    }
  };

  const reset = () => {
    setStep(1);
    setResult("");
    setFormData({ area: "", duration: "", painType: "", description: "" });
  };

  return (
    <div className="fixed bottom-4 left-4 sm:bottom-8 sm:left-8 z-[100]">
      <AnimatePresence>
        {isDiagnosisOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-4 sm:mb-8 w-[calc(100vw-32px)] sm:w-[450px] h-[500px] sm:h-[700px] flex flex-col bg-navy border border-paper/10 shadow-[0_32px_64px_-16px_rgba(28,43,75,0.3)] overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 sm:p-8 bg-navy text-paper flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-copper/10 rounded-full -translate-y-1/2 -translate-x-1/2 blur-3xl" />
              <div className="flex items-center gap-4 sm:gap-5 relative z-10">
                <div className="w-10 h-10 sm:w-12 h-12 bg-copper/10 rounded-full flex items-center justify-center text-copper border border-copper/30">
                  <Stethoscope size={24} className="text-copper" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg sm:text-xl tracking-tight">Diagnostic Tool</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.3em] opacity-60 font-bold">Musculoskeletal Analysis</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsDiagnosisOpen(false)} className="hover:text-copper transition-colors relative z-10">
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white/5">
              {step === 1 ? (
                <div className="space-y-6">
                  <p className="text-sm text-paper/70 font-light italic">Please provide details about your musculoskeletal symptoms.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-paper/50 mb-2">Affected Area</label>
                      <select 
                        value={formData.area}
                        onChange={(e) => setFormData({...formData, area: e.target.value})}
                        className="w-full bg-navy border border-paper/10 text-paper p-3 text-sm focus:border-copper outline-none"
                      >
                        <option value="">Select Area...</option>
                        <option value="Spine/Back">Spine / Back</option>
                        <option value="Shoulder">Shoulder</option>
                        <option value="Knee">Knee</option>
                        <option value="Hip">Hip</option>
                        <option value="Hand/Wrist">Hand / Wrist</option>
                        <option value="Foot/Ankle">Foot / Ankle</option>
                        <option value="General Muscle">General Muscle</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-paper/50 mb-2">Duration of Symptoms</label>
                      <select 
                        value={formData.duration}
                        onChange={(e) => setFormData({...formData, duration: e.target.value})}
                        className="w-full bg-navy border border-paper/10 text-paper p-3 text-sm focus:border-copper outline-none"
                      >
                        <option value="">Select Duration...</option>
                        <option value="Less than a week">Less than a week</option>
                        <option value="1-4 weeks">1-4 weeks</option>
                        <option value="1-6 months">1-6 months</option>
                        <option value="More than 6 months">More than 6 months</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-paper/50 mb-2">Pain Type</label>
                      <select 
                        value={formData.painType}
                        onChange={(e) => setFormData({...formData, painType: e.target.value})}
                        className="w-full bg-navy border border-paper/10 text-paper p-3 text-sm focus:border-copper outline-none"
                      >
                        <option value="">Select Pain Type...</option>
                        <option value="Sharp">Sharp / Stabbing</option>
                        <option value="Dull/Aching">Dull / Aching</option>
                        <option value="Burning">Burning</option>
                        <option value="Throbbing">Throbbing</option>
                        <option value="Numbness/Tingling">Numbness / Tingling</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-paper/50 mb-2">Describe Symptoms</label>
                      <textarea 
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Please describe your symptoms in detail..."
                        rows={4}
                        className="w-full bg-navy border border-paper/10 text-paper p-3 text-sm focus:border-copper outline-none resize-none placeholder:italic placeholder:text-paper/20"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleDiagnose}
                    disabled={!formData.area || !formData.duration || !formData.painType}
                    className="w-full bg-copper text-white py-4 text-sm font-bold tracking-widest uppercase hover:bg-copper/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Analyze Symptoms
                  </button>
                </div>
              ) : (
                <div className="space-y-6 h-full flex flex-col">
                  {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                      <div className="flex gap-2">
                        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-2 h-2 bg-copper rounded-full" />
                        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-2 h-2 bg-copper rounded-full" />
                        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-2 h-2 bg-copper rounded-full" />
                      </div>
                      <p className="text-xs text-copper uppercase tracking-widest font-bold animate-pulse">Analyzing Data...</p>
                      {queuePos !== null && queuePos > 0 && (
                        <div className="text-[10px] text-paper/50 font-mono space-y-1 text-center mt-4">
                          <p>Queue Position: <span className="text-copper">{queuePos}</span></p>
                          <p>Estimated Wait: <span className="text-copper">{estTime}s</span></p>
                        </div>
                      )}
                      {queuePos === 0 && (
                        <p className="text-[10px] text-emerald-400/70 font-mono mt-4">Processing your request...</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col space-y-6">
                      <div className="p-6 bg-copper/10 border border-copper/20 rounded-xl">
                        <h4 className="text-copper font-serif font-bold text-lg mb-4">Diagnostic Assessment</h4>
                        <div className="text-paper/80 text-sm leading-relaxed font-light whitespace-pre-wrap">
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                            {result.split('\n').map((line, i) => (
                              <p key={i} className={i === 0 ? "text-copper font-bold text-base mb-2" : "mb-1"}>{line}</p>
                            ))}
                          </motion.div>
                        </div>
                      </div>
                      
                      <div className="mt-auto pt-6 border-t border-paper/10">
                        <p className="text-[10px] text-paper/40 italic text-center mb-4">
                          Disclaimer: This assessment is generated by artificial intelligence and may be incorrect. It is not a substitute for professional medical advice, diagnosis, or treatment.
                        </p>
                        <button 
                          onClick={reset}
                          className="w-full bg-transparent border border-copper text-copper py-3 text-sm font-bold tracking-widest uppercase hover:bg-copper/10 transition-colors"
                        >
                          New Assessment
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn("relative", isOtherOpen && "hidden")}>
        <AnimatePresence>
          {showTooltip && !isDiagnosisOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-0 mb-4 w-48 bg-navy/90 backdrop-blur-md border border-copper/30 p-3 rounded-xl shadow-lg shadow-navy/50 z-50"
            >
              <button onClick={(e) => { e.stopPropagation(); onCloseTooltip(); }} className="absolute top-2 right-2 text-paper/50 hover:text-copper transition-colors">
                <X size={12} />
              </button>
              <p className="text-xs text-paper/80 font-serif italic pr-4">For diagnosis</p>
              <div className="absolute -bottom-2 left-6 w-4 h-4 bg-navy/90 border-b border-r border-copper/30 transform rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsDiagnosisOpen(!isDiagnosisOpen)}
          className="w-14 h-14 sm:w-16 sm:h-16 bg-navy/80 backdrop-blur-md text-copper shadow-[0_8px_32px_rgba(180,122,84,0.2)] flex items-center justify-center relative group rounded-full border border-copper/30 hover:border-copper/60 hover:shadow-[0_8px_32px_rgba(180,122,84,0.4)] transition-all duration-500"
        >
          <div className="relative z-10 flex items-center justify-center w-full h-full">
            {isDiagnosisOpen ? (
              <X size={24} className="text-copper transition-transform duration-500 rotate-90 group-hover:rotate-180" />
            ) : (
              <div className="relative flex items-center justify-center w-full h-full">
                <Stethoscope size={24} className="text-copper transition-transform duration-500 group-hover:scale-110" />
              </div>
            )}
          </div>
        </motion.button>
      </div>
    </div>
  );
}

// --- Chatbot Component ---

function Chatbot({ isChatOpen, setIsChatOpen, isOtherOpen, showTooltip, onCloseTooltip }: any) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: 'Greetings. I am the I1 Librarian. I am here to assist your research into musculoskeletal pathologies. How may I enlighten you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [queuePos, setQueuePos] = useState<number | null>(null);
  const [estTime, setEstTime] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setIsTyping(true);

    const queueDelay = new Promise<void>(resolve => {
      let q = Math.floor(Math.random() * 2) + 1;
      let t = q * 1.0;
      setQueuePos(q);
      setEstTime(Math.ceil(t));
      
      const intv = setInterval(() => {
        q -= 1;
        t -= 1.0;
        if (q > 0) {
          setQueuePos(q);
          setEstTime(Math.ceil(t));
        } else {
          setQueuePos(0);
          setEstTime(0);
          clearInterval(intv);
          resolve();
        }
      }, 1000);
    });

    try {
      const [response] = await Promise.all([
        genAI.models.generateContent({ 
          model: "gemini-3.1-flash-lite-preview",
          contents: [
            ...messages.map(m => ({
              role: m.role === 'user' ? 'user' : 'model',
              parts: [{ text: m.content }]
            })),
            { role: 'user', parts: [{ text: userMsg }] }
          ],
          config: {
            systemInstruction: `You are the "I1 Librarian", a prestigious and highly intelligent AI assistant for the I1 Skeleton Key Digital Medical Archive. 
            Your ONLY purpose is to answer questions related to musculoskeletal diseases, anatomy, physiology, and treatments.
            
            STRICT RULES:
            1. If a user asks about anything NOT related to musculoskeletal topics (e.g., cooking, politics, general tech, other medical fields like cardiology), you must politely decline and state that your expertise is strictly limited to the musculoskeletal system.
            2. Use a sophisticated, academic, and slightly formal tone.
            3. Provide detailed, medically accurate information.
            4. If the user asks for symptoms, comparisons, or locations of diseases in the library, provide them clearly.
            5. Do not hallucinate data. If you don't know, suggest consulting a medical professional.
            6. Keep responses concise but informative.`
          }
        }),
        queueDelay
      ]);

      const text = response.text;
      
      setMessages(prev => [...prev, { role: 'bot', content: text || "I apologize, but the archival record is currently inaccessible." }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'bot', content: 'I apologize, but I am currently unable to access the archival intelligence. Please try again shortly.' }]);
    } finally {
      setIsTyping(false);
      setQueuePos(null);
      setEstTime(null);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-[100]">
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-4 sm:mb-8 w-[calc(100vw-32px)] sm:w-[450px] h-[500px] sm:h-[700px] flex flex-col bg-navy border border-paper/10 shadow-[0_32px_64px_-16px_rgba(28,43,75,0.3)] overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 sm:p-8 bg-navy text-paper flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-copper/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="flex items-center gap-4 sm:gap-5 relative z-10">
                <div className="w-10 h-10 sm:w-12 h-12 bg-copper/10 rounded-full flex items-center justify-center text-copper border border-copper/30">
                  <MessageSquare size={24} className="text-copper" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg sm:text-xl tracking-tight">The Librarian</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.3em] opacity-60 font-bold">Archival Intelligence</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="hover:text-copper transition-colors relative z-10">
                <X size={24} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 sm:space-y-8 bg-white/5 scroll-smooth">
              {messages.map((msg, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}
                >
                  <span className="text-[8px] uppercase tracking-[0.4em] mb-2 sm:mb-3 opacity-30 font-bold text-paper">
                    {msg.role === 'user' ? 'Researcher' : 'Librarian'}
                  </span>
                  <div className={cn(
                    "max-w-[90%] p-4 sm:p-6 text-sm sm:text-base leading-relaxed font-light",
                    msg.role === 'user' 
                      ? "bg-copper text-white rounded-l-2xl rounded-tr-2xl" 
                      : "bg-white/10 text-paper border border-paper/5 rounded-r-2xl rounded-tl-2xl shadow-sm"
                  )}>
                    <div className="whitespace-pre-wrap font-serif italic text-base sm:text-lg opacity-90">
                      {msg.role === 'bot' && i === messages.length - 1 ? (
                        <TypewriterText text={msg.content} speed={15} />
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <div className="flex flex-col items-start">
                  <span className="text-[8px] uppercase tracking-[0.4em] mb-3 opacity-30 font-bold text-paper">Librarian</span>
                  <div className="p-4 sm:p-6 bg-white/10 border border-paper/5 rounded-r-2xl rounded-tl-2xl flex flex-col items-start gap-3">
                    <div className="flex gap-2">
                      <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 h-1.5 bg-copper rounded-full" />
                      <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1.5 h-1.5 bg-copper rounded-full" />
                      <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1.5 h-1.5 bg-copper rounded-full" />
                    </div>
                    {queuePos !== null && queuePos > 0 && (
                      <div className="text-[10px] text-paper/50 font-mono space-y-1">
                        <p>Queue Position: <span className="text-copper">{queuePos}</span></p>
                        <p>Estimated Wait: <span className="text-copper">{estTime}s</span></p>
                      </div>
                    )}
                    {queuePos === 0 && (
                      <p className="text-[10px] text-emerald-400/70 font-mono">Processing your request...</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 sm:p-8 bg-navy border-t border-paper/5">
              <div className="flex gap-3 sm:gap-4">
                <input 
                  type="text"
                  placeholder="Inquire..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1 bg-white/5 border border-paper/5 px-4 sm:px-6 py-3 sm:py-4 text-sm focus:ring-1 focus:ring-copper outline-none text-paper placeholder:italic transition-all"
                />
                <button 
                  onClick={handleSend}
                  disabled={isTyping}
                  className="w-12 h-12 sm:w-14 h-14 bg-copper text-white hover:bg-copper/90 transition-all disabled:opacity-50 flex items-center justify-center shadow-lg shadow-copper/20"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn("relative", isOtherOpen && "hidden")}>
        <AnimatePresence>
          {showTooltip && !isChatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full right-0 mb-4 w-48 bg-navy/90 backdrop-blur-md border border-copper/30 p-3 rounded-xl shadow-lg shadow-navy/50 z-50"
            >
              <button onClick={(e) => { e.stopPropagation(); onCloseTooltip(); }} className="absolute top-2 right-2 text-paper/50 hover:text-copper transition-colors">
                <X size={12} />
              </button>
              <p className="text-xs text-paper/80 font-serif italic pr-4">Here to ask the librarian</p>
              <div className="absolute -bottom-2 right-6 w-4 h-4 bg-navy/90 border-b border-r border-copper/30 transform rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 sm:w-16 sm:h-16 bg-navy/80 backdrop-blur-md text-copper shadow-[0_8px_32px_rgba(180,122,84,0.2)] flex items-center justify-center relative group rounded-full border border-copper/30 hover:border-copper/60 hover:shadow-[0_8px_32px_rgba(180,122,84,0.4)] transition-all duration-500"
        >
          <div className="relative z-10 flex items-center justify-center w-full h-full">
            {isChatOpen ? (
              <X size={24} className="text-copper transition-transform duration-500 rotate-90 group-hover:rotate-180" />
            ) : (
              <div className="relative flex items-center justify-center w-full h-full">
                <MessageSquare size={24} className="text-copper transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-copper rounded-full border-2 border-navy flex items-center justify-center animate-pulse">
                </div>
              </div>
            )}
          </div>
        </motion.button>
      </div>
    </div>
  );
}
