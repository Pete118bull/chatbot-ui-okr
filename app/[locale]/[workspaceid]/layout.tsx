"use client";

import { Dashboard } from "@/components/ui/dashboard";
import { ChatbotUIContext } from "@/context/context";
import {
  getAssistantWorkspacesByWorkspaceId,
  getChatsByWorkspaceId,
  getCollectionWorkspacesByWorkspaceId,
  getFileWorkspacesByWorkspaceId,
  getFoldersByWorkspaceId,
  getModelWorkspacesByWorkspaceId,
  getPresetWorkspacesByWorkspaceId,
  getPromptWorkspacesByWorkspaceId,
  getToolWorkspacesByWorkspaceId,
  getWorkspaceById,
} from "@/db";
import { getAssistantImageFromStorage } from "@/db/storage/assistant-images";
import { convertBlobToBase64 } from "@/lib/blob-to-b64";
import { supabase } from "@/lib/supabase/browser-client";
import { LLMID } from "@/types";
import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import Loading from "../loading";

interface WorkspaceLayoutProps {
  children: ReactNode;
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const workspaceId = params.workspaceid as string;

  const {
    setChatSettings,
    setAssistants,
    setAssistantImages,
    setChats,
    setCollections,
    setFolders,
    setFiles,
    setPresets,
    setPrompts,
    setTools,
    setModels,
    setSelectedWorkspace,
    setSelectedChat,
    setChatMessages,
    setUserInput,
    setIsGenerating,
    setFirstTokenReceived,
    setChatFiles,
    setChatImages,
    setNewMessageFiles,
    setNewMessageImages,
    setShowFilesDisplay,
  } = useContext(ChatbotUIContext);

  const [loading, setLoading] = useState(true);

  const fetchWorkspaceData = useCallback(
    async (workspaceId: string) => {
      setLoading(true);

      const workspace = await getWorkspaceById(workspaceId);
      setSelectedWorkspace(workspace);

      const assistantData = await getAssistantWorkspacesByWorkspaceId(workspaceId);
      setAssistants(assistantData.assistants);

      for (const assistant of assistantData.assistants) {
        let url = "";

        if (assistant.image_path) {
          url = (await getAssistantImageFromStorage(assistant.image_path)) || "";
        }

        if (url) {
          const response = await fetch(url);
          const blob = await response.blob();
          const base64 = await convertBlobToBase64(blob);

          setAssistantImages((prev) => [
            ...prev,
            {
              assistantId: assistant.id,
              path: assistant.image_path,
              base64,
              url,
            },
          ]);
        } else {
          setAssistantImages((prev) => [
            ...prev,
            {
              assistantId: assistant.id,
              path: assistant.image_path,
              base64: "",
              url,
            },
          ]);
        }
      }

      const chats = await getChatsByWorkspaceId(workspaceId);
      setChats(chats);

      const collectionData = await getCollectionWorkspacesByWorkspaceId(workspaceId);
      setCollections(collectionData.collections);

      const folders = await getFoldersByWorkspaceId(workspaceId);
      setFolders(folders);

      const fileData = await getFileWorkspacesByWorkspaceId(workspaceId);
      setFiles(fileData.files);

      const presetData = await getPresetWorkspacesByWorkspaceId(workspaceId);
      setPresets(presetData.presets);

      const promptData = await getPromptWorkspacesByWorkspaceId(workspaceId);
      setPrompts(promptData.prompts);

      const toolData = await getToolWorkspacesByWorkspaceId(workspaceId);
      setTools(toolData.tools);

      const modelData = await getModelWorkspacesByWorkspaceId(workspaceId);
      setModels(modelData.models);

      setChatSettings({
        model: (searchParams.get("model") ||
          workspace?.default_model ||
          "gpt-4-1106-preview") as LLMID,
        prompt:
          workspace?.default_prompt ||
          "You are a friendly, helpful AI assistant.",
        temperature: workspace?.default_temperature || 0.5,
        contextLength: workspace?.default_context_length || 4096,
        includeProfileContext: workspace?.include_profile_context ?? true,
        includeWorkspaceInstructions:
          workspace?.include_workspace_instructions ?? true,
        embeddingsProvider:
          (workspace?.embeddings_provider as "openai" | "local") || "openai",
      });

      setLoading(false);
    },
    [
      setAssistantImages,
      setAssistants,
      setChatSettings,
      setChats,
      setCollections,
      setFiles,
      setFolders,
      setModels,
      setPresets,
      setPrompts,
      setSelectedWorkspace,
      setTools,
      searchParams,
    ]
  );

  useEffect(() => {
    (async () => {
      const session = (await supabase.auth.getSession()).data.session;

      if (!session) {
        router.push("/login");
      } else {
        await fetchWorkspaceData(workspaceId);
      }
    })();
  }, [router, fetchWorkspaceData, workspaceId]);

  useEffect(() => {
    (async () => {
      await fetchWorkspaceData(workspaceId);
    })();

    setUserInput("");
    setChatMessages([]);
    setSelectedChat(null);
    setIsGenerating(false);
    setFirstTokenReceived(false);
    setChatFiles([]);
    setChatImages([]);
    setNewMessageFiles([]);
    setNewMessageImages([]);
    setShowFilesDisplay(false);
  }, [
    workspaceId,
    setUserInput,
    setChatMessages,
    setSelectedChat,
    setIsGenerating,
    setFirstTokenReceived,
    setChatFiles,
    setChatImages,
    setNewMessageFiles,
    setNewMessageImages,
    setShowFilesDisplay,
    fetchWorkspaceData,
  ]);

  if (loading) {
    return <Loading />;
  }

  return <Dashboard>{children}</Dashboard>;
}
