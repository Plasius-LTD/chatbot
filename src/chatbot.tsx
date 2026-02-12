import React, { lazy, Suspense, useState, useEffect } from "react";
import type { EmojiClickData } from "emoji-picker-react";

const EmojiPicker = lazy(() =>
  import("emoji-picker-react/dist/emoji-picker-react.esm.js").then(
    (module) => ({
      default: module.EmojiPicker, // <--- force the correct component export
    })
  )
);

import { FaPaperPlane, FaSmile } from "react-icons/fa";

import OpenAI from "openai";

import styles from "./styles/chatbot.module.css"; // Import a CSS file for styling

interface ChatBotProps {
  openaiOrgID: string;
  openaiProjectKey: string;
  openaiAPIKey: string;
}

export default function ChatBot(
  props: React.PropsWithChildren<ChatBotProps>
): React.ReactElement {
  const [messages, setMessages] = useState<
    OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  >([]);
  const [input, setInput] = useState<string>("");
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

  const openai = new OpenAI({
    apiKey: props.openaiAPIKey,
    project: props.openaiProjectKey,
    organization: props.openaiOrgID,
    dangerouslyAllowBrowser: true,
  });

  const chat = async (
    msgs: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    callback: (arg: OpenAI.Chat.Completions.ChatCompletionMessageParam) => void
  ): Promise<void> => {
    try {
      const value = await openai.chat.completions.create({
        model: "gpt-o1",
        messages: msgs,
      });
      value.choices.forEach((choice: OpenAI.ChatCompletion.Choice) => {
        callback({ content: choice.message.content ?? "", role: "system" });
      });
    } catch (err) {
      console.error("chat() failed", err);
    }
  };

  const objects = window.location.origin + "/api/objects/list";
  const decorations = window.location.origin + "/api/decorations/list";
  const locations = window.location.origin + "/api/locations/list";
  const surfaces = window.location.origin + "/api/surfaces/list";

  useEffect(() => {
    void chat(
      [
        {
          role: "system",
          content: `You are a game designer, you are responsible for helping build the world and game mechanics, adjusting the game to be more fun for the player playing, 
          using your knowledge of gameplay mechanics and world building you are going to help assign objects to the map.
          
          You can find the list of objects from the following url: ${objects}
          You can find the list of decorations from the following url: ${decorations}
          You can find the list of surfaces from the following url: ${surfaces}

          Each location is a hexagon with a radius of 10 meters and 10m tall (allowing  for locations to be on top of each other!), and a q and r coordinate system.
          The q coordinate is the horizontal axis, and the r coordinate is the vertical axis. The center of the hexagon is at (0, 0), 
          and the corners are at (5, 8.66), (10, 0), (5, -8.66), (-5, -8.66), (-10, 0), and (-5, 8.66).
          Adjacent hexagons are at (q + 1, r), (q - 1, r), (q, r + 1), (q, r - 1), (q + 1, r - 1), and (q - 1, r + 1) and you should try and 
          coordinate over the hexagons to make sure the objects are placed in a way that makes sense.
          
          Try and align surfaces, decorations, and objects to a 1m size hexagon when placing items so they align to each other in the world, 
          but avoid overlapping the objects with each other, unless they are meant to overlap (like a chair under a table, or a tree in a bush).
          Surfaces should not overlap with each other, and should be placed in a way that makes sense for the location, 
          such as a road should be continuous and have purpose, to or from somewhere, 
          use the locations map to identify good roads, forests, mountains, lakes and oceans locations.
          
          for each prompt the user gives you, will relate to a specific location in the game world, you should take in the location, 
          some basic information about the users expectations for the location and return a json object with the following fields:
            {
              "location": {
                "r": "number", // 10m hexagon radius
                "q": "number", // 10m hexagon radius
                "elevation": "number",
                "name": "string",
                "description": "string",
                "type": "string",
              
              "surfaces": [{
                "location": {
                  "q": "number", // 1m hexagon radius
                  "r": "number", // 1m hexagon radius
                  "elevation": "number"
                },
                "name": "string",
                "type": "string",
                "description": "string",
                "url": "string",
                "image": "string",
                "rotation": "number",
                "color": "string"
              }],
              "decorations": [
                {
                  "name": "string",
                  "type": "string",
                  "description": "string",
                  "url": "string",
                  "image": "string",
                  "rotation": "number",
                  "scale": "number",
                  "color": "string",
                  "location": {
                    "x": "number",
                    "y": "number",
                    "z": "number"
                  }
                }
              ],
              "objects": [
                {
                  "name": "string",
                  "type": "string",
                  "description": "string",
                  "url": "string",
                  "image": "string",
                  "rotation": "number",
                  "scale": "number",
                  "color": "string",
                  "location": {
                    "x": "number",
                    "y": "number",
                    "z": "number"
                  }
                }
              ]
            }
          }

          You can find the list of populated locations from the following url: ${locations} for reference and to allow you to be more creative in your assignments. 
          If your current location is in the list, then take the current objects and decorations into account when placing the new objects, and remove or replace the old ones.`,
        },
      ],
      (arg: OpenAI.Chat.Completions.ChatCompletionMessageParam) => {
        setMessages((prev) => [...prev, arg]);
      }
    );
  }, []);

  const handleSend = async (): Promise<void> => {
    if (input.trim()) {
      setMessages((prev) => [...prev, { content: input, role: "user" }]);
      setInput("");
      setShowEmojiPicker(false);

      try {
        const value = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ content: input, role: "user" }],
        });
        value.choices.forEach((choice: OpenAI.ChatCompletion.Choice) => {
          setMessages((prev) => [
            ...prev,
            { content: choice.message.content ?? "", role: "system" },
          ]);
        });
      } catch (err) {
        console.error("handleSend() failed", err);
      }
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData): void => {
    setInput((prev) => prev + (emojiData.emoji ?? ""));
  };

  const contentToString = (
    content: OpenAI.Chat.Completions.ChatCompletionMessageParam["content"]
  ): string => {
    if (typeof content === "string" || content == null) return content ?? "";
    if (Array.isArray(content)) {
      return content
        .map((part: unknown) => {
          if (typeof part === "string") return part;
          if (
            typeof part === "object" &&
            part !== null &&
            Object.prototype.hasOwnProperty.call(part, "text")
          ) {
            const text = (part as Record<string, unknown>).text;
            return typeof text === "string" ? text : "";
          }
          return "";
        })
        .join("");
    }
    return "";
  };

  return (
    <div className={styles.chatbotcontainer}>
      <div className={styles.messagesbox}>
        {messages.map((msg, index) => (
          <div key={index} className={styles.message + ` ${styles[msg.role]}`}>
            <div className={styles.bubble}>{contentToString(msg.content)}</div>
          </div>
        ))}
      </div>
      <div className={styles.inputbox}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyUp={async (e) => {
            if (e.key === "Enter" && e.shiftKey === false) {
              await handleSend();
              e.stopPropagation();
            }
          }}
          placeholder="Type a message..."
        />
        <FaSmile
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={styles.emojiicon}
        />
        {showEmojiPicker && (
          <Suspense fallback={<div>Loading emoji picker...</div>}>
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </Suspense>
        )}
        <FaPaperPlane onClick={handleSend} className={styles.sendicon} />
      </div>
    </div>
  );
}

/*

// Chatbot.tsx
import React, { useState } from 'react';
import { FaPaperPlane, FaSmile } from 'react-icons/fa';
import Picker, { IEmojiData } from 'emoji-picker-react';

interface Message {
  text: string;
  user: 'me' | 'bot';
}

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { text: input, user: 'me' }]);
      setInput('');
      setShowEmojiPicker(false);

      // Here you would also call the OpenAI API and handle the response
      // Example:
      // fetchOpenAIResponse(input).then(response => {
      //   setMessages([...messages, { text: input, user: 'me' }, { text: response, user: 'bot' }]);
      // });
    }
  };

  const handleEmojiClick = (event: React.MouseEvent<Element, MouseEvent>, emojiObject: IEmojiData) => {
    setInput(input + emojiObject.emoji);
  };

  return (
    <div className="chatbot-container">
      <div className="messages-box">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.user}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <div className="input-box">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <FaSmile onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="emoji-icon" />
        {showEmojiPicker && <Picker onEmojiClick={handleEmojiClick} />}
        <FaPaperPlane onClick={handleSend} className="send-icon" />
      </div>
    </div>
  );
};

export default Chatbot;

*/
