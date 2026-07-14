// "use server";

// import { generateObject } from "ai";
// import { google } from "@ai-sdk/google";

// import { db } from "@/firebase/admin";
// import { feedbackSchema } from "@/constants";

// export async function createFeedback(params: CreateFeedbackParams) {
//     const { interviewId, userId, transcript, feedbackId } = params;

//     try {
//         const formattedTranscript = transcript
//             .map(
//                 (sentence: { role: string; content: string }) =>
//                     `- ${sentence.role}: ${sentence.content}\n`
//             )
//             .join("");

//         const { object } = await generateObject({
//             model: google("gemini-2.0-flash-001", {
//                 structuredOutputs: false,
//             }),
//             schema: feedbackSchema,
//             prompt: `
//         You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
//         Transcript:
//         ${formattedTranscript}

//         Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
//         - **Communication Skills**: Clarity, articulation, structured responses.
//         - **Technical Knowledge**: Understanding of key concepts for the role.
//         - **Problem-Solving**: Ability to analyze problems and propose solutions.
//         - **Cultural & Role Fit**: Alignment with company values and job role.
//         - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
//         `,
//             system:
//                 "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
//         });

//         const feedback = {
//             interviewId: interviewId,
//             userId: userId,
//             totalScore: object.totalScore,
//             categoryScores: object.categoryScores,
//             strengths: object.strengths,
//             areasForImprovement: object.areasForImprovement,
//             finalAssessment: object.finalAssessment,
//             createdAt: new Date().toISOString(),
//         };

//         let feedbackRef;

//         if (feedbackId) {
//             feedbackRef = db.collection("feedback").doc(feedbackId);
//         } else {
//             feedbackRef = db.collection("feedback").doc();
//         }

//         await feedbackRef.set(feedback);

//         return { success: true, feedbackId: feedbackRef.id };
//     } catch (error) {
//         console.error("Error saving feedback:", error);
//         return { success: false };
//     }
// }

// export async function getInterviewById(id: string): Promise<Interview | null> {
//     const interview = await db.collection("interviews").doc(id).get();

//     return interview.data() as Interview | null;
// }

// export async function getFeedbackByInterviewId(
//     params: GetFeedbackByInterviewIdParams
// ): Promise<Feedback | null> {
//     const { interviewId, userId } = params;

//     const querySnapshot = await db
//         .collection("feedback")
//         .where("interviewId", "==", interviewId)
//         .where("userId", "==", userId)
//         .limit(1)
//         .get();

//     if (querySnapshot.empty) return null;

//     const feedbackDoc = querySnapshot.docs[0];
//     return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
// }

// export async function getLatestInterviews(
//     params: GetLatestInterviewsParams
// ): Promise<Interview[] | null> {
//     const { userId, limit = 20 } = params;

//     const interviews = await db
//         .collection("interviews")
//         .orderBy("createdAt", "desc")
//         .where("finalized", "==", true)
//         .where("userId", "!=", userId)
//         .limit(limit)
//         .get();

//     return interviews.docs.map((doc) => ({
//         id: doc.id,
//         ...doc.data(),
//     })) as Interview[];
// }

// export async function getInterviewsByUserId(
//     userId: string
// ): Promise<Interview[] | null> {
//     const interviews = await db
//         .collection("interviews")
//         .where("userId", "==", userId)
//         .orderBy("createdAt", "desc")
//         .get();

//     return interviews.docs.map((doc) => ({
//         id: doc.id,
//         ...doc.data(),
//     })) as Interview[];
// }

"use server";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";

export async function createFeedback(params: CreateFeedbackParams) {
    const { interviewId, userId, transcript, feedbackId } = params;

    try {
        const formattedTranscript = transcript
            .map(
                (sentence: { role: string; content: string }) =>
                    `- ${sentence.role}: ${sentence.content}\n`
            )
            .join("");

        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                temperature: 0.5,
                messages: [
                    {
                        role: "system",
                        content: "You are a professional interviewer analyzing a mock interview. Evaluate the candidate based on structured categories. Always respond with valid JSON only, no explanation or markdown.",
                    },
                    {
                        role: "user",
                        content: `
You are an AI interviewer analyzing a mock interview. Evaluate the candidate based on structured categories. Be thorough and detailed. Don't be lenient — point out mistakes and areas for improvement.

Transcript:
${formattedTranscript}

Score the candidate from 0 to 100 in these exact categories:
- Communication Skills: Clarity, articulation, structured responses
- Technical Knowledge: Understanding of key concepts for the role
- Problem Solving: Ability to analyze problems and propose solutions
- Cultural Fit: Alignment with company values and job role
- Confidence and Clarity: Confidence in responses, engagement, and clarity

Respond ONLY with a valid JSON object in this exact format, no extra text:
{
  "totalScore": 75,
  "categoryScores": [
    { "name": "Communication Skills", "score": 80, "comment": "..." },
    { "name": "Technical Knowledge", "score": 70, "comment": "..." },
    { "name": "Problem Solving", "score": 75, "comment": "..." },
    { "name": "Cultural Fit", "score": 80, "comment": "..." },
    { "name": "Confidence and Clarity", "score": 70, "comment": "..." }
  ],
  "strengths": ["strength 1", "strength 2"],
  "areasForImprovement": ["area 1", "area 2"],
  "finalAssessment": "Overall assessment here"
}`,
                    },
                ],
            }),
        });

        if (!groqResponse.ok) {
            const err = await groqResponse.json();
            throw new Error(`Groq error: ${JSON.stringify(err)}`);
        }

        const groqData = await groqResponse.json();
        const rawText = groqData.choices[0].message.content.trim();
        const cleanedText = rawText.replace(/^```json|^```|```$/g, "").trim();

        const parsed = JSON.parse(cleanedText);
        const object = feedbackSchema.parse(parsed);

        const feedback = {
            interviewId,
            userId,
            totalScore: object.totalScore,
            categoryScores: object.categoryScores,
            strengths: object.strengths,
            areasForImprovement: object.areasForImprovement,
            finalAssessment: object.finalAssessment,
            createdAt: new Date().toISOString(),
        };

        let feedbackRef;
        if (feedbackId) {
            feedbackRef = db.collection("feedback").doc(feedbackId);
        } else {
            feedbackRef = db.collection("feedback").doc();
        }

        await feedbackRef.set(feedback);
        return { success: true, feedbackId: feedbackRef.id };

    } catch (error) {
        console.error("Error saving feedback:", error);
        return { success: false };
    }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
    const interview = await db.collection("interviews").doc(id).get();
    return interview.data() as Interview | null;
}

export async function getFeedbackByInterviewId(
    params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
    const { interviewId, userId } = params;

    const querySnapshot = await db
        .collection("feedback")
        .where("interviewId", "==", interviewId)
        .where("userId", "==", userId)
        .limit(1)
        .get();

    if (querySnapshot.empty) return null;

    const feedbackDoc = querySnapshot.docs[0];
    return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(
    params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
    const { userId, limit = 20 } = params;

    // ✅ No orderBy, no != — zero Firestore index requirements
    const interviews = await db
        .collection("interviews")
        .where("finalized", "==", true)
        .get();

    // ✅ Sort and filter entirely in JavaScript
    const filtered = interviews.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Interview))
        .filter(interview => interview.userId !== userId)
        .sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, limit);

    return filtered;
}

export async function getInterviewsByUserId(
    userId: string
): Promise<Interview[] | null> {
    const interviews = await db
        .collection("interviews")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .get();

    return interviews.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Interview[];
}