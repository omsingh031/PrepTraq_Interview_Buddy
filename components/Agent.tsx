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
import { useEffect, useState } from "react";

import { createFeedback } from "@/lib/actions/general.action";
import { interviewer } from "@/constants";

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
                setMessages((prev) => [...prev, newMessage]);
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
            console.error("❌ Vapi Error:", error);
            if (error?.errorMsg === "Meeting has ended" && error?.action === "error") {
                console.log("Call ended normally.");
                return;
            }
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

        const handleGenerateFeedback = async (messages: SavedMessage[]) => {
            console.log("Generating feedback...");

            const { success, feedbackId: id } = await createFeedback({
                interviewId: interviewId!,
                userId: userId!,
                transcript: messages,
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
                router.push("/");
            } else {
                handleGenerateFeedback(messages);
            }
        }
    }, [messages, callStatus, feedbackId, interviewId, router, type, userId]);

    // ✅ ONLY THIS FUNCTION CHANGED
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