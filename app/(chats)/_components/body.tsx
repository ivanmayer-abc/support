"use client";

import { FullMessageType } from "@/app/types";
import useConversation from "@/hooks/use-conversation";
import { useEffect, useRef, useState } from "react";
import MessageBox from "./message-box";
import { pusherClient } from "@/lib/pusher";
import { find } from "lodash";
import { useSession } from "next-auth/react";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface BodyProps {
    initialMessages: FullMessageType[];
}

const Body: React.FC<BodyProps> = ({ initialMessages }) => {
    const [messages, setMessages] = useState(initialMessages);
    const bottomRef = useRef<HTMLDivElement>(null);
    const { supportId } = useConversation();
    const session = useSession();
    const user = session?.data?.user;
    const router = useRouter();

    useEffect(() => {
        pusherClient.subscribe(supportId);
        const messageHandler = (message: FullMessageType) => {
            
            if (!message?.id || !message?.sender) {
                const currentDate = new Date();
                message.sender = {
                    id: user?.id || "unknown-user",
                    name: user?.name || null,
                    email: user?.email || null,
                    emailVerified: null,
                    image: null,
                    password: null,
                    role: "USER",
                    isTwoFactorEnabled: false,
                    isBlocked: false,
                    isChatBlocked: false,
                    createdAt: currentDate,
                    updatedAt: currentDate,
                    surname: null,
                    birth: null,
                    country: null,
                    city: null,
                    isImageApproved: "none"
                } as any;
                console.warn("Received message with missing sender:", message);
            }

            setMessages((current) => {
                if (find(current, { id: message.id })) return current;
                return [...current, message];
            });
        };

        pusherClient.bind("messages:new", messageHandler);

        return () => {
            pusherClient.unsubscribe(supportId);
            pusherClient.unbind("messages:new", messageHandler);
        };
    }, [supportId, user]);

    useEffect(() => {
        bottomRef?.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        requestAnimationFrame(() => {
            bottomRef?.current?.scrollIntoView({ behavior: "smooth" });
        });
    }, [messages]);

    const handleBackClick = () => {
        router.back();
    };

    return (
        <div className="chat-container">
            {messages.map((message, i) => (
                <MessageBox
                    isLast={i === messages.length - 1}
                    key={message.id}
                    data={message}
                />
            ))}
            <div ref={bottomRef} />
        </div>
    );
};

export default Body;