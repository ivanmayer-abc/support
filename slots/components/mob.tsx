"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { GoTriangleRight } from "react-icons/go";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";

import lemon from "../public/lemon.png";
import orange from "../public/orange.png";
import diamond from "../public/diamond.png";
import bell from "../public/bell.png";
import cherries from "../public/cherries.png";
import spinIcon from "../public/spinicon.png";

const symbols = [
  { symbol: lemon, rarity: 0.4, basePayout: 5 },
  { symbol: cherries, rarity: 0.375, basePayout: 7.5 },
  { symbol: orange, rarity: 0.185, basePayout: 10 },
  { symbol: bell, rarity: 0.03, basePayout: 20 },
  { symbol: diamond, rarity: 0.01, basePayout: 100 },
];

const animationDuration = 1500;

const getRandomSymbol = () => {
  const rand = Math.random();
  let sum = 0;
  for (const { symbol, rarity } of symbols) {
    sum += rarity;
    if (rand < sum) return symbol;
  }
  return symbols[symbols.length - 1].symbol;
};

const checkWin = (reels, bet) => {
  let payout = 0;
  let winningLines = [];

  for (const { symbol, basePayout } of symbols) {
    const value = (basePayout / 5) * bet;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col <= 2; col++) {
        if (
          reels[col][row] === symbol &&
          reels[col + 1][row] === symbol &&
          reels[col + 2][row] === symbol
        ) {
          let positions = [
            { col, row },
            { col: col + 1, row },
            { col: col + 2, row },
          ];
          payout += value;

          if (col + 3 < 5 && reels[col + 3][row] === symbol) {
            payout += value * 0.5;
            positions.push({ col: col + 3, row });
          }
          if (
            col + 4 < 5 &&
            reels[col + 3][row] === symbol &&
            reels[col + 4][row] === symbol
          ) {
            payout += value;
            positions.push({ col: col + 4, row });
          }
          winningLines.push(positions);
        }
      }
    }
  }

  return { payout, winningLines };
};

const SlotMachine = () => {
  const [balance, setBalance] = useState(100000);
  const [bet, setBet] = useState(100);
  const [reels, setReels] = useState(() => 
    Array.from({ length: 5 }, () => Array(3).fill(null).map(() => getRandomSymbol()))
  );
  const [spinning, setSpinning] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [winningLines, setWinningLines] = useState([]);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [autoSpin, setAutoSpin] = useState(false);
  const [remainingAutoSpins, setRemainingAutoSpins] = useState(0);
  const [autoSpinMenuVisible, setAutoSpinMenuVisible] = useState(false);
  const [tempAutoSpinCount, setTempAutoSpinCount] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const reelRefs = useRef([]);

  const adjustedAnimationDuration = animationDuration / speedMultiplier;
  const adjustedSpinDuration = adjustedAnimationDuration * 1.1;

  const spinReels = () => {
    // Prevent spinning if conditions aren't met
    if (balance < bet || spinning || bet < 100 || bet > 10000) return;
    
    setSpinning(true);
    setBalance((prev) => prev - bet);
    setWinAmount(0);
    setWinningLines([]);
  
    // Generate new reel positions with some prevention of long streaks
    let finalReels = Array(5).fill(null).map(() => Array(3).fill(null));
    
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        let newSymbol;
    
        // Prevent 3+ of the same symbol in a row (50% chance)
        if (
          col >= 2 &&
          finalReels[col - 1][row] === finalReels[col - 2][row] &&
          Math.random() > 0.5 
        ) {
          const bannedSymbol = finalReels[col - 1][row];
          const filteredSymbols = symbols.filter(s => s.symbol !== bannedSymbol);
          newSymbol = filteredSymbols[Math.floor(Math.random() * filteredSymbols.length)].symbol;
        } else {
          newSymbol = getRandomSymbol();
        }
    
        finalReels[col][row] = newSymbol;
      }
    }      
    setReels(finalReels);
  
    // Animation setup - responsive version
    const isMobile = window.innerWidth < 768; // Standard mobile breakpoint
    const symbolHeight = isMobile ? 80 : 220; // Matches your mobile/desktop CSS heights
    const totalSpinDistance = symbolHeight * 15; // 15 symbols worth of spinning
  
    reelRefs.current.forEach((reel, i) => {
      const reelElement = reel;
      if (!reelElement) return;
      
      // Reset position without animation
      reelElement.style.transition = 'none';
      reelElement.style.transform = 'translateY(0)';
      
      // Force reflow before starting animation
      void reelElement.offsetHeight;
      
      // Start spinning animation
      reelElement.style.transition = `transform ${adjustedAnimationDuration}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
      reelElement.style.transform = `translateY(${-totalSpinDistance}px)`;
    });
  
    // Handle spin completion
    setTimeout(() => {
      const { payout, winningLines } = checkWin(finalReels, bet);
      setBalance((prev) => prev + payout);
      setWinAmount(payout);
      setWinningLines(winningLines);
      setSpinning(false);
  
      // Handle auto-spin continuation
      if (autoSpin && remainingAutoSpins > 0) {
        setRemainingAutoSpins((prev) => prev - 1);
        if (remainingAutoSpins <= 1) {
          setAutoSpin(false);
        }
      }
    }, adjustedAnimationDuration);
  };

  useEffect(() => {
    if (autoSpin && remainingAutoSpins > 0 && !spinning) {
      const interval = setInterval(() => {
        if (!spinning && remainingAutoSpins > 0) {
          spinReels();
        }
      }, adjustedSpinDuration);
      return () => clearInterval(interval);
    }
  }, [autoSpin, spinning, remainingAutoSpins]);

  const presetBets = [100, 500, 1000, 5000];
  const handleSpeedButtonClick = () => {
    setSpeedMultiplier((prev) => (prev === 1 ? 2 : prev === 2 ? 3 : 1));
  };

  const isWinningPosition = (colIndex, rowIndex) => {
    return winningLines.some(line =>
      line.some(pos => pos.col === colIndex && pos.row === rowIndex)
    );
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 text-center min-h-screen relative overflow-x-hidden">
      <p className="text-2xl fixed top-2.5 right-8">
        Balance: <span className="text-yellow-400">${balance}</span>
        {winAmount > 0 && <span className="text-lime-500">(+${winAmount})</span>}
      </p>
      <div className="absolute md:left-[150px] md:mt-[-96px] top-[55px] flex justify-center items-center md:w-[1200px] w-full  md:h-[730px] border-2 border-yellow-400 overflow-hidden p-2.5 rounded-xl bg-black bg-opacity-70">
        {reels.map((col, colIndex) => (
          <div 
            key={colIndex} 
            className="flex flex-col items-center md:h-[700px] h-[160px] md:w-[250px] w-[80px] overflow-hidden relative"
          >
            <div 
              ref={el => reelRefs.current[colIndex] = el}
              className="flex flex-col absolute top-0 gap-4"
            >
              {[...Array(15)].map((_, i) => {
                const rowIndex = i % 3;
                const symbol = col[rowIndex];
                const isWinning = isWinningPosition(colIndex, rowIndex);
                
                return (
                  <div 
                    key={`pre-${colIndex}-${i}`} 
                    className={`flex justify-center items-center md:w-[220px] w-[40px] h-[40px] md:h-[220px] text-5xl transition-all duration-300 ${
                      isWinning ? "bg-yellow-400 bg-opacity-30 border-4 border-yellow-400 rounded-[25%]" : ""
                    }`}
                  >
                    <Image src={symbol} alt="symbol" width={110} height={64} />
                  </div>
                );
              })}
              
              {col.map((symbol, rowIndex) => {
                const isWinning = isWinningPosition(colIndex, rowIndex);

                return (
                  <div
                    className={`flex justify-center items-center md:w-[220px] w-[40px] h-[40px] md:h-[220px] text-5xl transition-all duration-300 ${
                      isWinning ? "bg-yellow-400 bg-opacity-30 border-4 border-yellow-400 rounded-[25%]" : ""
                    }`}
                    key={`${colIndex}-${rowIndex}`}
                  >
                    <Image 
                      src={symbol} 
                      alt="symbol" 
                      width={110} 
                      height={64} 
                      className={`transition-transform duration-300
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={spinReels}
        disabled={spinning || autoSpin}
        className={`flex items-center justify-center md:w-56 w-[150px] md:h-56 border-2 border-white rounded-full hover:bg-gray-300 transition-all duration-300 fixed md:right-[120px] md:mt-[-96px] bottom-[120px] cursor-pointer bg-white ${
          spinning ? "animate-pulse" : ""
        }`}
        style={{
          boxShadow: "0 0 20px rgba(255, 255, 255, 0.7)",
          transform: spinning ? "rotate(360deg)" : "rotate(0deg)",
          transition: spinning ? `transform ${adjustedAnimationDuration}ms ease-out` : "transform 0.3s ease"
        }}
      >
        <Image src={spinIcon} alt="Spin" width={200} height={128} />
      </button>

      <div className="flex flex-col fixed w-full bottom-0 left-0 border-t-2 border-white py-4 px-8 bg-black">
        <div className="flex justify-between relative items-center gap-8">
          <div className="md:flex gap-3 hidden">
            {presetBets.map((amount) => (
              <Button 
                key={amount} 
                onClick={() => setBet(amount)} 
                disabled={spinning || autoSpin} 
                className="text-3xl py-2.5 px-6 hover:scale-105 transition-transform"
              >
                {amount}
              </Button>
            ))}
          </div>

          <div className="w-full">
            <Input
              className="bg-white text-black text-3xl px-4 py-2 text-center hover:scale-105 transition-transform"
              type="number"
              value={bet}
              min={100}
              max={10000}
              onChange={(e) => setBet(Math.min(10000, Math.max(100, Number(e.target.value))))}
              disabled={spinning || autoSpin}
            />
          </div>

          <button
            className="md:flex border-2 border-white rounded-full py-1 px-2 hover:bg-gray-700 transition duration-300 hover:scale-105 hidden"
            onClick={handleSpeedButtonClick}
          >
            <GoTriangleRight size={50} color={speedMultiplier >= 1 ? "white" : "gray"} />
            <GoTriangleRight className="ml-[-25px] mr-[-25px]" size={50} color={speedMultiplier >= 2 ? "white" : "gray"} />
            <GoTriangleRight size={50} color={speedMultiplier >= 3 ? "white" : "gray"} />
          </button>

          <div className="md:flex hidden">
            {autoSpin && remainingAutoSpins > 0 ? (
              <button
                onClick={() => setAutoSpin(false)}
                className="relative w-[110px] py-2.5 px-5 text-2xl bg-red-600 text-white border-none rounded-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-red-700 hover:shadow-md"
              >
                Stop
                <span className="absolute -top-2 -right-2 bg-green-400 text-black text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {remainingAutoSpins}
                </span>
              </button>
            ) : (
              <div className="flex gap-8">
                <Dialog>
                  <DialogTrigger>
                    <div
                      className="relative flex border-2 border-white rounded-full py-2 px-6 hover:bg-gray-700 transition duration-300 hover:scale-105 text-4xl"
                      onClick={() => setAutoSpinMenuVisible((prev) => !prev)}
                    >
                      Auto
                    </div>
                  </DialogTrigger>
                  <DialogContent className="text-white max-w-[350px] flex flex-col items-center py-10">
                    <DialogTitle className="text-4xl text-white">
                      How many spins?
                    </DialogTitle>
                    <DialogFooter className="mt-2 flex justify-center gap-4">
                      <div className="grid grid-cols-2 gap-y-3 gap-x-5">
                        <Button
                          onClick={() => {
                            setRemainingAutoSpins(5)
                            setAutoSpin(true);
                          }}
                          className="flex border-2 border-white rounded-full py-1 px-4 hover:bg-gray-200 transition duration-300 hover:scale-105 text-3xl"
                        >
                          5
                        </Button>
                        <Button
                          onClick={() => {
                            setRemainingAutoSpins(10)
                            setAutoSpin(true);
                          }}
                          className="flex border-2 border-white rounded-full py-1 px-4 hover:bg-gray-200 transition duration-300 hover:scale-105 text-3xl"
                        >
                          10
                        </Button>
                        <Button
                          onClick={() => {
                            setRemainingAutoSpins(20)
                            setAutoSpin(true);
                          }}
                          className="flex border-2 border-white rounded-full py-1 px-4 hover:bg-gray-200 transition duration-300 hover:scale-105 text-3xl"
                        >
                          20
                        </Button>
                        <Button
                          onClick={() => {
                            setRemainingAutoSpins(50)
                            setAutoSpin(true);
                          }}
                          className="flex border-2 border-white rounded-full py-1 px-4 hover:bg-gray-200 transition duration-300 hover:scale-105 text-3xl"
                        >
                          50
                        </Button>
                        <Button
                          onClick={() => {
                            setRemainingAutoSpins(100)
                            setAutoSpin(true);
                          }}
                          className="flex border-2 border-white rounded-full py-1 px-4 hover:bg-gray-200 transition duration-300 hover:scale-105 text-3xl"
                        >
                          100
                        </Button>
                        <Button
                          onClick={() => {
                            setRemainingAutoSpins(1000)
                            setAutoSpin(true);
                          }}
                          className="flex border-2 border-white rounded-full py-1 px-4 hover:bg-gray-200 transition duration-300 hover:scale-105 text-3xl"
                        >
                          1000
                        </Button>
                      </div>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotMachine;