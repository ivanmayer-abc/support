"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { GoTriangleRight } from "react-icons/go";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import lemon from "../public/lemon.png";
import orange from "../public/orange.png";
import diamond from "../public/diamond.png";
import bell from "../public/bell.png";
import cherries from "../public/cherries.png";
import spinIcon from "../public/spinicon.png";

const symbols = [
  { symbol: lemon, rarity: 0.4, basePayout: 2.5 },
  { symbol: cherries, rarity: 0.375, basePayout: 5 },
  { symbol: orange, rarity: 0.185, basePayout: 7.5 },
  { symbol: bell, rarity: 0.039, basePayout: 10 },
  { symbol: diamond, rarity: 0.001, basePayout: 100 },
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

const Demo = () => {
  const [balance, setBalance] = useState(100000);
  const [bet, setBet] = useState(100);
  const [reels, setReels] = useState(Array.from({ length: 5 }, () => Array(3).fill("❓")));
  const [spinning, setSpinning] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [winningLines, setWinningLines] = useState([]);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [autoSpin, setAutoSpin] = useState(false);
  const [remainingAutoSpins, setRemainingAutoSpins] = useState(0);
  const [autoSpinMenuVisible, setAutoSpinMenuVisible] = useState(false);
  const [tempAutoSpinCount, setTempAutoSpinCount] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const adjustedAnimationDuration = animationDuration / speedMultiplier;
  const adjustedSpinDuration = adjustedAnimationDuration * 1.1;

  const spinReels = () => {
    if (balance < bet || spinning || bet < 100 || bet > 10000) return;
    setSpinning(true);
    setBalance((prev) => prev - bet);
    setWinAmount(0);

    let finalReels = Array.from({ length: 5 }, () =>
      Array.from({ length: 3 }, () => getRandomSymbol())
    );

    let tempReels = Array.from({ length: 5 }, () =>
      Array.from({ length: 15 }, () => getRandomSymbol())
    );

    setReels(tempReels.map((col, i) => [...col, ...finalReels[i]]));

    setTimeout(() => {
      setReels(finalReels);
      const { payout, winningLines } = checkWin(finalReels, bet);
      setBalance((prev) => prev + payout);
      setWinAmount(payout);
      setWinningLines(winningLines);
      setSpinning(false);

      if (autoSpin && remainingAutoSpins > 0) {
        setRemainingAutoSpins((prev) => prev - 1);
      }

      if (remainingAutoSpins <= 1) {
        setAutoSpin(false);
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
  const autoSpinOptions = [10, 20, 50, 100, "∞"];

  const handleSpeedButtonClick = () => {
    setSpeedMultiplier((prev) => (prev === 1 ? 2 : prev === 2 ? 3 : 1));
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8" style={{ textAlign: "center", fontSize: "2rem", minHeight: "100vh", position: "relative", overflowX: "hidden" }}>
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="text-white max-w-[400px] flex items-center flex-col">
          <DialogTitle className="text-4xl text-white">
            {tempAutoSpinCount} spins?
          </DialogTitle>
          <DialogFooter className="mt-2 flex justify-center gap-4">
            <Button className="px-4 py-2 text-xl" onClick={() => setConfirmDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button
              onClick={() => {
                setRemainingAutoSpins(tempAutoSpinCount === "∞" ? Infinity : Number(tempAutoSpinCount));
                setAutoSpin(true);
                setConfirmDialogOpen(false);
                setAutoSpinMenuVisible(false);
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-xl"
            >
              Let's go Gambling!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p style={{ fontSize: "1.5rem", position: "fixed", top: "10px", right: "30px" }}>
        Balance: <span style={{ color: "gold" }}>${balance}</span>
        {winAmount > 0 && <span style={{ color: "lime" }}>(+${winAmount})</span>}
      </p>

      <div className="absolute left-[150px] mt-[-96px]" style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "1200px",
        height: "715px",
        border: "3px solid gold",
        overflow: "hidden",
        padding: "10px",
        borderRadius: "15px"
      }}>
        {reels.map((col, colIndex) => (
          <div key={colIndex} style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            height: "100%",
            width: "250px",
            overflow: "hidden",
            position: "relative",
          }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              position: "absolute",
              top: spinning ? "-1500px" : "0px",
              transition: spinning ? `top ${adjustedAnimationDuration}ms ease-out` : "none",
              gap: "15px"
            }}>
              {col.map((symbol, rowIndex) => {
                const isImage = typeof symbol === "object" && symbol?.src;
                const isWinning = winningLines.some(line =>
                  line.some(pos => pos.col === colIndex && pos.row === rowIndex)
                );

                return (
                  <span
                    className="flex justify-center items-center"
                    key={`${colIndex}-${rowIndex}`}
                    style={{
                      width: "220px",
                      height: "220px",
                      fontSize: "3rem",
                      background: isWinning ? "rgba(255, 223, 0, 0.3)" : "none",
                      border: isWinning ? "5px solid gold" : "none",
                      borderRadius: isWinning ? "25%" : "0",
                      transition: "all 0.3s ease"
                    }}
                  >
                    {isImage ? (
                      <Image src={symbol} alt="symbol" width={110} height={64} />
                    ) : (
                      symbol
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
  onClick={spinReels}
  disabled={spinning || autoSpin}
  className={`flex items-center justify-center w-56 h-56 border-2 border-white rounded-full hover:bg-gray-300 transition duration-300 fixed right-[120px] mt-[-96px] cursor-pointer bg-white ${
    spinning ? "animate-slow-spin" : ""
  }`}
>
  <Image src={spinIcon} alt="Spin" width={200} height={128} />
</button>





      <div className="flex flex-col fixed w-full bottom-0 left-0 border-t-2 border-white py-4 px-8 bg-black">
        <div className="flex justify-between relative items-center gap-8">
          <div className="flex gap-3">
            {presetBets.map((amount) => (
              <Button key={amount} onClick={() => setBet(amount)} disabled={spinning || autoSpin} className="text-3xl py-2.5 px-6">
                {amount}
              </Button>
            ))}
          </div>

          <div className="w-full">
            <Input
              className="bg-white text-black text-3xl px-4 py-2 text-center"
              type="number"
              value={bet}
              min={100}
              max={10000}
              onChange={(e) => setBet(Math.min(10000, Math.max(100, Number(e.target.value))))}
              disabled={spinning || autoSpin}
            />
          </div>

          <button
            className="flex border-2 border-white rounded-full py-1 px-2 hover:bg-gray-700 transition duration-300"
            onClick={handleSpeedButtonClick}
          >
            <GoTriangleRight size={50} color={speedMultiplier >= 1 ? "white" : "gray"} />
            <GoTriangleRight className="ml-[-25px] mr-[-25px]" size={50} color={speedMultiplier >= 2 ? "white" : "gray"} />
            <GoTriangleRight size={50} color={speedMultiplier >= 3 ? "white" : "gray"} />
          </button>

          <div className="absolute top-[-100px] right-0 p-2 border-2 border-white rounded-md bg-black"
            style={{ right: autoSpinMenuVisible ? "0" : "-100%", transition: "right 0.3s ease-out" }}>
            <div className="flex gap-2 bg-black px-3 py-2 rounded-lg">
              {autoSpinOptions.map(option => (
                <Button
                  key={option}
                  onClick={() => {
                    setTempAutoSpinCount(option);
                    setConfirmDialogOpen(true);
                  }}
                  className="bg-black text-white py-2 px-5 rounded-lg hover:bg-gray-700 transition duration-300 text-3xl"
                  size="lg"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex">
            {autoSpin && remainingAutoSpins > 0 ? (
              <button
                onClick={() => setAutoSpin(false)}
                style={{
                  width: "110px",
                  padding: "10px 20px",
                  fontSize: "1.5rem",
                  backgroundColor: "red",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer"
                }}
              >
                Stop
              </button>
            ) : (
              <div className="flex gap-8">
                <button
                  className="flex border-2 border-white rounded-full py-1 px-6 hover:bg-gray-700 transition duration-300"
                  onClick={() => setAutoSpinMenuVisible((prev) => !prev)}
                >
                  Auto
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Demo;
