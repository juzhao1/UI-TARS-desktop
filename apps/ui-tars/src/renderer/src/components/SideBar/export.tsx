/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Loader2, FolderOutput } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import { DropdownMenuItem } from '@renderer/components/ui/dropdown-menu';
import { useStore } from '@renderer/hooks/useStore';
import { useSetting } from '@renderer/hooks/useSetting';
import { IMAGE_PLACEHOLDER } from '@ui-tars/shared/constants';
import { useSession } from '@renderer/hooks/useSession';
import { chatManager } from '@renderer/db/chat';
import { SessionMetaInfo } from '../../db/session';

export function ExportButton({ sessionId }: { sessionId: string }) {
  const { status } = useStore();
  const { sessions } = useSession();
  const { settings } = useSetting();

  const isExporting = useRef(false);

  const handleExport = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (isExporting.current) return;

    isExporting.current = true;
    const chatMessages =
      (await chatManager.getSessionMessages(sessionId)) || [];
    const lastHumanMessage =
      [...(chatMessages || [])]
        .reverse()
        .find((m) => m?.from === 'human' && m?.value !== IMAGE_PLACEHOLDER)
        ?.value || '';
    const restUserData = (sessions.find((item) => item.id === sessionId)
      ?.meta || {}) as SessionMetaInfo;

    const id = sessionId.split('_').reverse()[0];
    try {
      const res = await window.electron.task.exportConversation({
        data: {
          ...restUserData,
          sessionId: id,
          status,
          conversations: chatMessages,
          modelDetail: {
            name: settings.vlmModelName,
            provider: settings.vlmProvider,
            baseUrl: settings.vlmBaseUrl,
            maxLoop: settings.maxLoopCount,
          },
          instruction: lastHumanMessage,
        },
        filename: `conversation.json`,
        folder: `/logs/${id}`,
      });
      if (res?.details) {
        console.log(`导出文件失败: ${res.details}`);
        toast.error(`导出失败1: ${res?.details}`);
      } else {
        toast.success('导出成功');
      }
    } catch (error) {
      toast.error(`导出失败2: ${error}`);
    }
    isExporting.current = false;
  };

  return (
    <>
      <DropdownMenuItem onClick={(e) => handleExport(e)}>
        {isExporting.current ? (
          <Loader2 className="animate-spin" />
        ) : (
          <FolderOutput />
        )}
        <span>Export</span>
      </DropdownMenuItem>
    </>
  );
}
