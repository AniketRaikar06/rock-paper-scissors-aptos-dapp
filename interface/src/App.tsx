import React, { useState, useEffect } from "react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import {
  InputTransactionData,
  useWallet,
} from "@aptos-labs/wallet-adapter-react";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import styled from "styled-components";

import donaldImage from "./images/donald.png";
import kamalaImage from "./images/kamala.png";

const moduleName = "BitcoinToe5";
const moduleAddress = "34377ce2dff9245600c983f9675f4f86a86fc574405c862c4fb33bc3374da117";

const WindowWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f0f0;
`;

const WalletWrapper = styled.div`
  position: absolute;
  align-items: right;
  right: 10px;
  top: 10px;
  background-color: #f0f0f0;
`;

const CenteredWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f0f0;
`;

const GameWrapper = styled.div`
  width: 550px;
  padding: 20px;
  background-color: #808080;
  border-radius: 30px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 20px;
`;

const InternalWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

const Display = styled.div`
  background-color: #e0e0e0;
  color: black;
  font-size: 18px;
  padding: 20px;
  border-radius: 15px;
  font-weight: bold;
  margin-bottom: 20px;
  text-align: center;
`;

const DisplayHeading = styled.div`
  background-color: transparent;
  color: black;
  font-size: 20px;
  padding: 5px;
  font-weight: bold;
  margin-bottom: 5px;
  text-align: center;
`;

const ResultBox = styled.div<{
  color?: string;
  wide?: boolean;
  disabled?: boolean;
}>`
  background-color: ${({ color, disabled }) =>
    disabled ? "#c0c0c0" : color || "#4CAF50"};
  width: 500px;
  color: ${({ disabled }) => (disabled ? "#888888" : "black")};
  font-size: 24px;
  padding: 20px;
  border: none;
  border-radius: 15px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  font-weight: bold;
  margin-top: 20px;
  text-align: center;
`;

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
`;

const Button = styled.button<{
  color?: string;
  wide?: boolean;
  disabled?: boolean;
}>`
  background-color: ${({ color, disabled }) =>
    disabled ? "#c0c0c0" : color || "#d0d0d0"};
  color: ${({ disabled }) => (disabled ? "#888888" : "black")};
  font-size: 24px;
  padding: 20px;
  border: none;
  border-radius: 15px;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  grid-column: ${({ wide }) => (wide ? "span 2" : "span 1")};
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  &:hover {
    opacity: ${({ disabled }) => (disabled ? "1" : "0.8")};
  }
`;

const OperationButton = styled(Button)`
  background-color: ${({ disabled }) => (disabled ? "#c0c0c0" : "#ff9500")};
  color: ${({ disabled }) => (disabled ? "#888888" : "white")};
`;

const ToggleButton = styled.button<{ active: boolean }>`
  background-color: ${({ active }) => (active ? "#f44336" : "#4CAF50")};
  color: white;
  font-size: 18px;
  padding: 10px 20px;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  margin-bottom: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  &:hover {
    opacity: 0.8;
  }
`;

const ComputerButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  justify-content: center;
  align-items: center;
`;

const ComputerButton = styled.div<{
  color?: string;
  wide?: boolean;
  disabled?: boolean;
}>`
  background-color: ${({ color, disabled }) =>
    disabled ? "#c0c0c0" : color || "#d0d0d0"};
  color: ${({ disabled }) => (disabled ? "#888888" : "black")};
  font-size: 24px;
  padding: 20px;
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 15px;
  grid-column: ${({ wide }) => (wide ? "span 2" : "span 1")};
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
`;

const ComputerOperationButton = styled(ComputerButton)`
  background-color: ${({ disabled }) => (disabled ? "#c0c0c0" : "#ff9500")};
  color: ${({ disabled }) => (disabled ? "#888888" : "white")};
`;

const App: React.FC = () => {
  const [board, setBoard] = useState<string[]>(Array(9).fill(""));
  const [winner, setWinner] = useState<string | null>(null);
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [transactionInProgress, setTransactionInProgress] =
    useState<boolean>(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string>("");
  const [gameId , setGameId] = useState<number>(1005);
  const aptosConfig = new AptosConfig({ network: Network.TESTNET });
  const client = new Aptos(aptosConfig);

  const checkWinner = (board: string[]) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  };

  const playerCharacter = selectedCharacter;
  const computerCharacter = playerCharacter === "Donald Trump" ? "Kamala Harris" : "Donald Trump";

  const createGame = async (selectedCharacter: string) => {
    if (!account) return;
    const characterCode = selectedCharacter === "Donald Trump" ? 1 : 2;
    setGameId(gameId => gameId + 1);

    const payload: InputTransactionData = {
      data: {
        function: `${moduleAddress}::${moduleName}::create_game`,
        functionArguments: [characterCode],
      },
    };
    try {
      setTransactionInProgress(true);
      const response = await signAndSubmitTransaction(payload);
      console.log(response);
      alert("Game created successfully!");
    } catch (error) {
      console.error("Error creating game:", error);
    } finally {
      setTransactionInProgress(false);
    }
  };

  const updateWinner = async (gameId: number, playerWins: boolean) => {
    if (!account) return;
    const payload: InputTransactionData = {
      data: {
        function: `${moduleAddress}::${moduleName}::set_winner`,
        functionArguments: [gameId , playerWins],
      },
    };
    try {
      setTransactionInProgress(true);
      const response = await signAndSubmitTransaction(payload);
      console.log(response);
      alert("Winner set successfully!");
    } catch (error) {
      console.error("Error setting winner:", error);
    } finally {
      setTransactionInProgress(false);
    }
  };

  const handleCharacterSelection = (character: string) => {
    setSelectedCharacter(character);
    setBoard(Array(9).fill(""));
    setWinner(null);
    createGame(character);
  };

  const handleClick = async (index: number) => {
    if (winner || board[index]) return;

    const newBoard = board.slice();
    newBoard[index] = "X"; // Player's move
    setBoard(newBoard);

    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      updateWinner(gameId, true);
      setWinner(gameWinner);
      alert(`${gameWinner === "X" ? playerCharacter : computerCharacter} wins! BTC price will ${gameWinner === "X" ? (playerCharacter === "Kamala Harris" ? "decrease" : "increase") : (computerCharacter === "Kamala Harris" ? "decrease" : "increase")}.`);
      return;
    }

    // Simulate computer move
    setTimeout(() => {
      const emptyIndices = newBoard
        .map((value, idx) => (value === "" ? idx : null))
        .filter((val) => val !== null);
      if (emptyIndices.length > 0) {
        const randomIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        newBoard[randomIndex as number] = "O";
        setBoard([...newBoard]);

        const computerWinner = checkWinner(newBoard);
        if (computerWinner) {
          updateWinner(gameId, false);
          setWinner(computerWinner);
          alert(`${computerWinner === "X" ? playerCharacter : computerCharacter} wins! BTC price will ${computerWinner === "X" ? (playerCharacter === "Kamala Harris" ? "decrease" : "increase") : (computerCharacter === "Kamala Harris" ? "decrease" : "increase")}.`);
        }
      }
    }, 500); // Add a slight delay for computer move
  };

  const handleGameEnd = () => {
    if (winner) {
      setTimeout(() => {
        window.location.reload();
      }, 2000); // Reload after 2 seconds to allow user to see the winner message
    } else if (!board.includes("")) { // Check for draw
      setTimeout(() => {
        alert("It's a draw! Starting a new game.");
        setBoard(Array(9).fill(""));
        setWinner(null);
      }, 2000); // Reset after 2 seconds to allow user to see the draw message
    }
  };

  useEffect(() => {
    handleGameEnd();
  }, [winner, board]);

  const characterSelectionView = () => {
    return (
      <CenteredWrapper>
        <h2>Select Your Character</h2>
        <div style={{ display: "flex", gap: "20px" }}>
          <Button onClick={() => handleCharacterSelection("Donald Trump")}
                  style={{ padding: "0", border: "none", background: "none" }}>
            <img src={donaldImage} alt="Donald Trump" style={{ width: "100px", height: "100px" }} />
          </Button>
          <Button onClick={() => handleCharacterSelection("Kamala Harris")}
                  style={{ padding: "0", border: "none", background: "none" }}>
            <img src={kamalaImage} alt="Kamala Harris" style={{ width: "100px", height: "100px" }} />
          </Button>
        </div>
      </CenteredWrapper>
    );
  };

  const connectedView = () => {
    if (!selectedCharacter) {
      return characterSelectionView();
    }
    return (
      <CenteredWrapper>
        <h1>Crypto Prediction Tic-Tac-Toe: Battle Between Donald and Kamala</h1>
        <GameWrapper>
          <h2>Tic-Tac-Toe</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 100px)", gap: "10px" }}>
            {board.map((value, index) => (
              <Button key={index} onClick={() => handleClick(index)} style={{ width: "100px", height: "100px", padding: "0", border: "none", background: "none" }}>
                {value === "X" ? (
                  <img
                    src={selectedCharacter === "Donald Trump" ? donaldImage : kamalaImage}
                    alt={selectedCharacter}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : value === "O" ? (
                  <img
                    src={selectedCharacter === "Donald Trump" ? kamalaImage : donaldImage}
                    alt={selectedCharacter === "Donald Trump" ? "Kamala Harris" : "Donald Trump"}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : null}
              </Button>
            ))}
          </div>
          {winner && <h3>{winner === "X" ? playerCharacter : computerCharacter} wins the game!</h3>}
        </GameWrapper>
      </CenteredWrapper>
    );
  };

  return connected ? connectedView() : <WalletWrapper><WalletSelector /></WalletWrapper>;
};

export default App;
