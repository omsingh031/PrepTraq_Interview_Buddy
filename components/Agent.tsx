// "use client";

// import { cn } from "@/lib/utils";
// import { vapi } from "@/lib/vapi.sdk";
// import Image from "next/image";
// import { useRouter } from "next/navigation";
// import { useEffect, useState } from "react";

// import { createFeedback } from "@/lib/actions/general.action";
// import {interviewer} from "@/constants";

// enum CallStatus {
//     INACTIVE = "INACTIVE",
//     CONNECTING = "CONNECTING",
//     ACTIVE = "ACTIVE",
//     FINISHED = "FINISHED",
// }

// interface SavedMessage {
//     role: "user" | "system" | "assistant";
//     content: string;
// }

// interface AgentProps {
//     userName: string;
//     userId: string;
//     type: string;
//     interviewId?: string;
//     questions?: string[];
//     feedbackId?: string;
// }

// const Agent = ({
//                    userName,
//                    userId,
//                    interviewId,
//                    feedbackId,
//                    type,
//                    questions,
//                }: AgentProps) => {
//     const router = useRouter();
//     const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
//     const [messages, setMessages] = useState<SavedMessage[]>([]);
//     const [isSpeaking, setIsSpeaking] = useState(false);
//     const [error, setError] = useState<string>("");
//     const [lastMessage, setLastMessage] = useState<string>("");

//     useEffect(() => {
//         const onCallStart = () => {
//             console.log("Call started");
//             setCallStatus(CallStatus.ACTIVE);
//             setError("");
//         };

//         const onCallEnd = async () => {
//             console.log("Call ended");
//             setCallStatus(CallStatus.FINISHED);
//         };

//         const onMessage = (message: any) => {
//             console.log("Message received:", message);
//             if (message.type === "transcript" && message.transcriptType === "final") {
//                 const newMessage = {
//                     role: message.role,
//                     content: message.transcript,
//                 };
//                 setMessages((prev) => [...prev, newMessage]);
//             }
//         };

//         const onSpeechStart = () => {
//             console.log("Speech started");
//             setIsSpeaking(true);
//         };

//         const onSpeechEnd = () => {
//             console.log("Speech ended");
//             setIsSpeaking(false);
//         };

//         const onError = (error: any) => {
//             console.error("Vapi Error:", error);
//             if (error?.errorMsg === "Meeting has ended" && error?.action === "error") {
//                 console.log("Call ended normally by assistant.");
//                 return;
//             }
//             setError(error.message || "An error occurred!!!");
//             setCallStatus(CallStatus.INACTIVE);
//         };

//         vapi.on("call-start", onCallStart);
//         vapi.on("call-end", onCallEnd);
//         vapi.on("message", onMessage);
//         vapi.on("speech-start", onSpeechStart);
//         vapi.on("speech-end", onSpeechEnd);
//         vapi.on("error", onError);

//         return () => {
//             vapi.off("call-start", onCallStart);
//             vapi.off("call-end", onCallEnd);
//             vapi.off("message", onMessage);
//             vapi.off("speech-start", onSpeechStart);
//             vapi.off("speech-end", onSpeechEnd);
//             vapi.off("error", onError);
//         };
//     }, []);

//     useEffect(() => {
//         if (messages.length > 0) {
//             setLastMessage(messages[messages.length - 1].content);
//         }

//         const handleGenerateFeedback = async (messages: SavedMessage[]) => {
//             console.log("handleGenerateFeedback");

//             const { success, feedbackId: id } = await createFeedback({
//                 interviewId: interviewId!,
//                 userId: userId!,
//                 transcript: messages,
//                 feedbackId,
//             });

//             if (success && id) {
//                 router.push(`/interview/${interviewId}/feedback`);
//             } else {
//                 console.log("Error saving feedback");
//                 router.push("/");
//             }
//         };

//         if (callStatus === CallStatus.FINISHED) {
//             if (type === "generate") {
//                 router.push("/");
//             } else {
//                 handleGenerateFeedback(messages);
//             }
//         }
//     }, [messages, callStatus, feedbackId, interviewId, router, type, userId]);

//     const handleCall = async () => {
//         console.log("Starting call...");
//         setCallStatus(CallStatus.CONNECTING);
//         setError("");

//         try {
//             if (type === "generate") {
//                 const workflowId = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID;

//                 if (!workflowId) {
//                     throw new Error("NEXT_PUBLIC_VAPI_WORKFLOW_ID is not configured");
//                 }

//                 await vapi.start(undefined, undefined, undefined, workflowId);

//                 vapi.send({
//                     type: "control",
//                     control: "set-variable",
//                     variable: {
//                         name: "userid",
//                         value: userId,
//                     },
//                 }as any);

//                 setTimeout(() => {
//                     vapi.send({
//                         type: "control",
//                         control: "say-first-message",
//                     });
//                 }, 500);

//                 console.log("Call started successfully with workflow");
//             } else {

//                 let formattedQuestions = "";
//                 if (questions) {
//                     formattedQuestions = questions
//                         .map((question) => `- ${question}`)
//                         .join("\n");
//                 }

//                 await vapi.start(interviewer, {
//                     variableValues: {
//                         questions: formattedQuestions,
//                     },
//                 });
//             }
//         }
//         catch (error: any) {
//             console.error("Failed to start call:", error);
//             setCallStatus(CallStatus.INACTIVE);
//             setError(error.message || "Failed to start call");

//             if (error.message?.includes("workflow") || error.message?.includes("assistantId")) {
//                 alert("Workflow configuration error. Please check your workflow ID in the dashboard.");
//             } else {
//                 alert("Failed to start call. Please try again.");
//             }
//         }
//     };

//     const handleDisconnect = () => {
//         console.log("Disconnecting call...");
//         vapi.stop();
//         setCallStatus(CallStatus.FINISHED);
//     };

//     const latestMessage = messages[messages.length - 1]?.content;
//     const isCallInactiveFinished =
//         callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED;

//     return (
//         <>
//             <div className="call-view">
//                 <div className="card-interviewer">
//                     <div className="avatar">
//                         <Image
//                             src="/ai-avatar.png"
//                             alt="AI Interviewer"
//                             width={65}
//                             height={54}
//                             className="object-cover"
//                         />
//                         {isSpeaking && <span className="animate-speak" />}
//                     </div>
//                     <h3>AI Interviewer</h3>
//                     {callStatus === CallStatus.ACTIVE && (
//                         <div className="status-indicator">
//                             <span className="status-dot animate-pulse bg-green-500"></span>
//                             <span className="text-sm text-green-600">Live</span>
//                         </div>
//                     )}
//                 </div>

//                 <div className="card-border">
//                     <div className="card-content">
//                         <Image
//                             src="/profile.svg"
//                             alt="User profile"
//                             width={539}
//                             height={539}
//                             className="rounded-full object-cover size-[120px]"
//                         />
//                         <h3>{userName}</h3>
//                         {callStatus === CallStatus.CONNECTING && (
//                             <p className="text-sm text-gray-500">Connecting...</p>
//                         )}
//                     </div>
//                 </div>
//             </div>

//             {error && (
//                 <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//                     <strong>Error:</strong> {error}
//                 </div>
//             )}

//             {messages.length > 0 && (
//                 <div className="transcript-border">
//                     <div className="transcript">
//                         <p
//                             key={latestMessage}
//                             className={cn(
//                                 "transition-opacity duration-500 opacity-0",
//                                 "animate-fadeIn opacity-100"
//                             )}
//                         >
//                             {latestMessage}
//                         </p>
//                     </div>
//                 </div>
//             )}

//             <div className="w-full flex justify-center">
//                 {callStatus !== CallStatus.ACTIVE ? (
//                     <button
//                         className="relative btn-call"
//                         onClick={handleCall}
//                         disabled={callStatus === CallStatus.CONNECTING}
//                     >
//                         <span
//                             className={cn(
//                                 "absolute animate-ping rounded-full opacity-75",
//                                 callStatus !== CallStatus.CONNECTING && "hidden"
//                             )}
//                         />
//                         <span>
//                             {callStatus === CallStatus.CONNECTING
//                                 ? "Connecting..."
//                                 : isCallInactiveFinished
//                                     ? "Start Call"
//                                     : "..."}
//                         </span>
//                     </button>
//                 ) : (
//                     <button className="btn-disconnect" onClick={handleDisconnect}>
//                         End Call
//                     </button>
//                 )}
//             </div>
//         </>
//     );
// };

// export default Agent;

//Using Assistant for mock interviews and feedback generation

"use client";

import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createFeedback } from "@/lib/actions/general.action";
import { interviewer } from "@/constants";

// ─── Transcript Parser ──────────────────────────────────────────────────────
// Extracts interview parameters from the conversation transcript.
// The AI asks about role, tech stack, experience level, type, and amount.
function extractInterviewParams(messages: SavedMessage[]) {
    const fullText = messages
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n")
        .toLowerCase();

    // --- Role ---
    const rolePatterns = [
        /(?:applying for|role(?:\s+is)?|position(?:\s+is)?|job(?:\s+is)?)[:\s]+([a-z\s]+?)(?:\s*[,.\n]|$)/i,
        /(?:i(?:'m| am)(?: a| an)?)[:\s]+([a-z\s]+?developer[a-z\s]*?)(?:\s*[,.\n]|$)/i,
        /(?:i(?:'m| am)(?: a| an)?)[:\s]+([a-z\s]+?engineer[a-z\s]*?)(?:\s*[,.\n]|$)/i,
    ];
    let role = "Software Developer";
    for (const pat of rolePatterns) {
        const m = fullText.match(pat);
        if (m?.[1]?.trim()) {
            role = m[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
            break;
        }
    }

    // --- Tech Stack ---
    const knownTechs = [
        "react", "next.js", "nextjs", "vue", "angular", "node.js", "nodejs",
        "express", "typescript", "javascript", "python", "java", "c#", "c++",
        "go", "rust", "php", "ruby", "swift", "kotlin", "flutter", "dart",
        "django", "fastapi", "spring", "mongodb", "postgresql", "mysql",
        "firebase", "aws", "azure", "gcp", "docker", "kubernetes", "graphql",
        "tailwind", "sass", "redux", "prisma", "supabase", "sql",
    ];
    const foundTechs = knownTechs.filter((tech) => fullText.includes(tech));
    const techstack = foundTechs.length > 0 ? foundTechs.join(", ") : "JavaScript, React";

    // --- Level ---
    let level = "Junior";
    if (/\bsenior\b/.test(fullText)) level = "Senior";
    else if (/\bmid[-\s]?level\b|\bmiddle\b/.test(fullText)) level = "Mid-level";
    else if (/\bjunior\b|\bentry[-\s]?level\b|\bfresher\b/.test(fullText)) level = "Junior";

    // --- Type ---
    let type = "technical";
    if (/\bbehaviou?ral\b/.test(fullText)) type = "behavioural";
    else if (/\bmixed\b/.test(fullText)) type = "mixed";
    else if (/\btechnical\b/.test(fullText)) type = "technical";

    // --- Amount ---
    const amountMatch = fullText.match(/\b(\d+)\s*(?:questions?)\b/);
    const amount = amountMatch ? parseInt(amountMatch[1], 10) : 5;

    return { role, techstack, level, type, amount };
}

enum CallStatus {
    INACTIVE = "INACTIVE",
    CONNECTING = "CONNECTING",
    ACTIVE = "ACTIVE",
    FINISHED = "FINISHED",
}

interface SavedMessage {
    role: "user" | "system" | "assistant";
    content: string;
}

interface AgentProps {
    userName: string;
    userId: string;
    type: string;
    interviewId?: string;
    questions?: string[];
    feedbackId?: string;
}

const Agent = ({
    userName,
    userId,
    interviewId,
    feedbackId,
    type,
    questions,
}: AgentProps) => {
    const router = useRouter();
    const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
    const [messages, setMessages] = useState<SavedMessage[]>([]);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState<string>("");
    const [lastMessage, setLastMessage] = useState<string>("");
    const [isGenerating, setIsGenerating] = useState(false);
    // Use a ref so the FINISHED handler always has access to the latest messages
    const messagesRef = useRef<SavedMessage[]>([]);

    useEffect(() => {
        const onCallStart = () => {
            console.log("✅ Call started");
            setCallStatus(CallStatus.ACTIVE);
            setError("");
        };

        const onCallEnd = async () => {
            console.log("✅ Call ended");
            setCallStatus(CallStatus.FINISHED);
        };

        const onMessage = (message: any) => {
            console.log("Message received:", message);
            if (message.type === "transcript" && message.transcriptType === "final") {
                const newMessage = {
                    role: message.role,
                    content: message.transcript,
                };
                setMessages((prev) => {
                    const updated = [...prev, newMessage];
                    messagesRef.current = updated;
                    return updated;
                });
            }
        };

        const onSpeechStart = () => {
            console.log("Speech started");
            setIsSpeaking(true);
        };

        const onSpeechEnd = () => {
            console.log("Speech ended");
            setIsSpeaking(false);
        };

        const onError = (error: any) => {
            // "Meeting has ended" is VAPI's normal signal that the AI ended the call.
            // Guard this BEFORE console.error so the Next.js dev overlay is not triggered.
            if (error?.errorMsg === "Meeting has ended" || error?.message === "Meeting has ended") {
                console.log("✅ Call ended normally by assistant.");
                return;
            }
            console.error("❌ Vapi Error:", error);
            setError(error.message || "An error occurred");
            setCallStatus(CallStatus.INACTIVE);
        };

        vapi.on("call-start", onCallStart);
        vapi.on("call-end", onCallEnd);
        vapi.on("message", onMessage);
        vapi.on("speech-start", onSpeechStart);
        vapi.on("speech-end", onSpeechEnd);
        vapi.on("error", onError);

        return () => {
            vapi.off("call-start", onCallStart);
            vapi.off("call-end", onCallEnd);
            vapi.off("message", onMessage);
            vapi.off("speech-start", onSpeechStart);
            vapi.off("speech-end", onSpeechEnd);
            vapi.off("error", onError);
        };
    }, []);

    useEffect(() => {
        if (messages.length > 0) {
            setLastMessage(messages[messages.length - 1].content);
        }

        const handleGenerateInterview = async (msgs: SavedMessage[]) => {
            console.log("📋 Parsing transcript to generate interview...");
            setIsGenerating(true);

            const params = extractInterviewParams(msgs);
            console.log("Extracted params:", params);

            try {
                const response = await fetch("/api/vapi/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...params,
                        userid: userId,
                    }),
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    console.log("✅ Interview generated and saved to Firestore!");
                } else {
                    console.error("❌ Failed to generate interview:", data);
                }
            } catch (err) {
                console.error("❌ Network error generating interview:", err);
            } finally {
                setIsGenerating(false);
                router.push("/");
            }
        };

        const handleGenerateFeedback = async (msgs: SavedMessage[]) => {
            console.log("Generating feedback...");

            const { success, feedbackId: id } = await createFeedback({
                interviewId: interviewId!,
                userId: userId!,
                transcript: msgs,
                feedbackId,
            });

            if (success && id) {
                router.push(`/interview/${interviewId}/feedback`);
            } else {
                console.log("Error saving feedback");
                router.push("/");
            }
        };

        if (callStatus === CallStatus.FINISHED) {
            if (type === "generate") {
                // Use ref to ensure we have the latest messages even if state batching delays
                handleGenerateInterview(messagesRef.current.length > 0 ? messagesRef.current : messages);
            } else {
                handleGenerateFeedback(messages);
            }
        }
    }, [messages, callStatus, feedbackId, interviewId, router, type, userId]);

    const handleCall = async () => {
        console.log("Starting call...");
        setCallStatus(CallStatus.CONNECTING);
        setError("");

        try {
            if (type === "generate") {
                // ✅ Assistant mode — pass assistant ID as string directly
                const assistantId = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID;

                if (!assistantId) {
                    throw new Error("NEXT_PUBLIC_VAPI_WORKFLOW_ID is not configured in .env.local");
                }

                // Pass userId so webhook can save to correct user's Firestore
                await vapi.start(assistantId, {
                    variableValues: {
                        userid: userId,
                    },
                });

                console.log("✅ Call started with assistant ID:", assistantId);

            } else {
                // ✅ Inject questions from Firestore into interviewer
                if (!questions || questions.length === 0) {
                    throw new Error("No questions found for this interview");
                }

                const formattedQuestions = questions
                    .map((q, i) => `${i + 1}. ${q}`)
                    .join("\n");

                await vapi.start(interviewer, {
                    variableValues: {
                        questions: formattedQuestions,
                    },
                });

                console.log("✅ Call started with interviewer + questions");
            }
        } catch (error: any) {
            console.error("❌ Failed to start call:", error);
            setCallStatus(CallStatus.INACTIVE);
            setError(error.message || "Failed to start call");
            alert("Failed to start call: " + (error.message || "Please try again."));
        }
    };

    const handleDisconnect = () => {
        console.log("Disconnecting call...");
        vapi.stop();
        setCallStatus(CallStatus.FINISHED);
    };

    const latestMessage = messages[messages.length - 1]?.content;
    const isCallInactiveFinished =
        callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED;

    // Show a full-screen loading overlay while generating the interview card
    if (isGenerating) {
        return (
            <div className="flex flex-col items-center justify-center gap-6 py-16">
                <div className="relative flex items-center justify-center">
                    <span className="absolute inline-flex h-24 w-24 rounded-full bg-primary-200 opacity-30 animate-ping" />
                    <span className="relative inline-flex h-16 w-16 rounded-full bg-primary-200 items-center justify-center">
                        <svg className="animate-spin h-8 w-8 text-primary-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                    </span>
                </div>
                <div className="text-center">
                    <h3 className="text-xl font-semibold">Generating Your Interview...</h3>
                    <p className="text-sm text-gray-400 mt-2">We&apos;re preparing your personalized questions. This will take a moment.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="call-view">
                <div className="card-interviewer">
                    <div className="avatar">
                        <Image
                            src="/ai-avatar.png"
                            alt="AI Interviewer"
                            width={65}
                            height={54}
                            className="object-cover"
                        />
                        {isSpeaking && <span className="animate-speak" />}
                    </div>
                    <h3>AI Interviewer</h3>
                    {callStatus === CallStatus.ACTIVE && (
                        <div className="status-indicator">
                            <span className="status-dot animate-pulse bg-green-500"></span>
                            <span className="text-sm text-green-600">Live</span>
                        </div>
                    )}
                </div>

                <div className="card-border">
                    <div className="card-content">
                        <Image
                            src="/profile.svg"
                            alt="User profile"
                            width={539}
                            height={539}
                            className="rounded-full object-cover size-[120px]"
                        />
                        <h3>{userName}</h3>
                        {callStatus === CallStatus.CONNECTING && (
                            <p className="text-sm text-gray-500">Connecting...</p>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {messages.length > 0 && (
                <div className="transcript-border">
                    <div className="transcript">
                        <p
                            key={latestMessage}
                            className={cn(
                                "transition-opacity duration-500 opacity-0",
                                "animate-fadeIn opacity-100"
                            )}
                        >
                            {latestMessage}
                        </p>
                    </div>
                </div>
            )}

            <div className="w-full flex justify-center">
                {callStatus !== CallStatus.ACTIVE ? (
                    <button
                        className="relative btn-call"
                        onClick={handleCall}
                        disabled={callStatus === CallStatus.CONNECTING}
                    >
                        <span
                            className={cn(
                                "absolute animate-ping rounded-full opacity-75",
                                callStatus !== CallStatus.CONNECTING && "hidden"
                            )}
                        />
                        <span>
                            {callStatus === CallStatus.CONNECTING
                                ? "Connecting..."
                                : isCallInactiveFinished
                                    ? "Start Call"
                                    : "..."}
                        </span>
                    </button>
                ) : (
                    <button className="btn-disconnect" onClick={handleDisconnect}>
                        End Call
                    </button>
                )}
            </div>
        </>
    );
};

export default Agent;