import React, { useContext, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../contexts/AuthContext";
import AuthModal from "./AuthModal";

/* Animated film-reel particles that float around the logo */
const PARTICLES = [
  { x: -28, y: -16, delay: 0, size: 5 },
  { x: 28, y: -18, delay: 0.3, size: 4 },
  { x: -22, y: 18, delay: 0.6, size: 3 },
  { x: 24, y: 16, delay: 0.9, size: 5 },
  { x: 0, y: -24, delay: 0.45, size: 3 },
];

const LogoParticle = React.memo(({ x, y, delay, size }) => (
  <motion.span
    className="absolute rounded-full bg-gradient-to-br from-purple-400 to-pink-500 pointer-events-none"
    style={{ width: size, height: size, left: "50%", top: "50%", marginLeft: x, marginTop: y }}
    animate={{
      y: [0, -6, 0, 6, 0],
      opacity: [0.6, 1, 0.6, 1, 0.6],
      scale: [1, 1.3, 1, 1.3, 1],
    }}
    transition={{ duration: 3, repeat: Infinity, delay, ease: "easeInOut" }}
  />
));

/* Letter-by-letter animation for "CineVault" */
const logoLetters = "CineVault".split("");

const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b border-white/5 ${scrolled ? "bg-black/80 backdrop-blur-xl shadow-lg shadow-purple-900/20 py-4" : "bg-[#09090b]/90 backdrop-blur-lg py-6"
          }`}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.1 }}
      >
        {/* Animated top border glow */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.8), rgba(236,72,153,0.8), transparent)",
          }}
          animate={{ opacity: scrolled ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        />

        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          {/* ── Animated Logo ── */}
          <Link
            to="/"
            className="flex items-center gap-3 group"
            onMouseEnter={() => setLogoHovered(true)}
            onMouseLeave={() => setLogoHovered(false)}
          >
            {/* Icon with floating particles */}
            <div className="relative w-10 h-10 flex items-center justify-center">
              <motion.span
                className="text-3xl select-none"
                animate={logoHovered ? { rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.2, 1] } : { rotate: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              >
                🎬
              </motion.span>
              {PARTICLES.map((p, i) => (
                <LogoParticle key={i} {...p} />
              ))}
            </div>

            {/* Letter-by-letter "CineVault" */}
            <span className="flex text-2xl font-black tracking-tight overflow-hidden">
              {logoLetters.map((letter, i) => (
                <motion.span
                  key={i}
                  className={
                    i < 4
                      ? "bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-purple-500"
                      : "bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-pink-600"
                  }
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.045, type: "spring", stiffness: 200, damping: 18 }}
                  whileHover={{ y: -3, scale: 1.15 }}
                >
                  {letter}
                </motion.span>
              ))}
            </span>

            {/* Shimmer underline on hover */}
            <motion.div
              className="absolute bottom-0 left-0 h-[2px] rounded-full"
              style={{ background: "linear-gradient(90deg, #a855f7, #ec4899)" }}
              initial={false}
              animate={{ width: logoHovered ? "100%" : "0%", opacity: logoHovered ? 1 : 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </Link>

          {/* ── Nav links ── */}
          <motion.nav
            className="flex space-x-8 items-center font-medium"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 120 }}
          >
            {[{ path: "/", label: "Home", activeColor: "text-purple-400" },
            { path: "/watchlist", label: "Watchlist", activeColor: "text-pink-400" }
            ].map(({ path, label, activeColor }) => (
              <Link
                key={path}
                to={path}
                className={`relative transition-colors hover:${activeColor} ${location.pathname === path ? `${activeColor} font-semibold` : "text-gray-300"
                  }`}
              >
                {label}
                {location.pathname === path && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-purple-400 to-pink-500"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            ))}

            <AnimatePresence mode="wait">
              {user ? (
                <motion.div
                  key="user-info"
                  className="flex items-center gap-4 ml-4 pl-4 border-l border-white/20"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <span className="text-gray-200">
                    Hi,{" "}
                    <motion.span
                      className="text-purple-400 font-semibold"
                      animate={{ color: ["#c084fc", "#f472b6", "#c084fc"] }}
                      transition={{ duration: 4, repeat: Infinity }}
                    >
                      {user.name}
                    </motion.span>
                  </span>
                  <motion.button
                    onClick={logout}
                    className="px-4 py-2 bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-gray-300 rounded-lg transition-all border border-white/10 hover:border-red-500/50"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Logout
                  </motion.button>
                </motion.div>
              ) : (
                <motion.button
                  key="sign-in"
                  onClick={() => setAuthModalOpen(true)}
                  className="ml-4 px-6 py-2 bg-white/10 hover:bg-purple-600/30 text-white rounded-lg transition-all border border-white/20 hover:border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0)] hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Sign In
                </motion.button>
              )}
            </AnimatePresence>
          </motion.nav>
        </div>
      </motion.header>

      { }
      <div className="h-24" />

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

export default Header;
