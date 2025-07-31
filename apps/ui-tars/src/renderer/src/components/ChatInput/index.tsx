/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { IMAGE_PLACEHOLDER } from '@ui-tars/shared/constants';
import { StatusEnum } from '@ui-tars/shared/types';

import { useRunAgent } from '@renderer/hooks/useRunAgent';
import { useStore } from '@renderer/hooks/useStore';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip';
import { Button } from '@renderer/components/ui/button';
// import { useScreenRecord } from '@renderer/hooks/useScreenRecord';
import { api } from '@renderer/api';

import { Play, Send, Square, Loader2 } from 'lucide-react';
import { Textarea } from '@renderer/components/ui/textarea';
import { useSession } from '@renderer/hooks/useSession';
import { chatManager } from '@renderer/db/chat';

import { Operator } from '@main/store/types';
import { useSetting } from '../../hooks/useSetting';

const ChatInput = ({
  operator,
  sessionId,
  disabled,
  checkBeforeRun,
}: {
  operator: Operator;
  sessionId: string;
  disabled: boolean;
  checkBeforeRun?: () => Promise<boolean>;
}) => {
  const {
    status,
    instructions: savedInstructions,
    messages,
    restUserData,
  } = useStore();
  const [tasks, setTasks] = useState<string[]>([]);
  const [localInstructions, setLocalInstructions] = useState('');
  const { run, stopAgentRuning } = useRunAgent();
  const { getSession, updateSession, chatMessages } = useSession();
  const { settings, updateSetting } = useSetting();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const running = status === StatusEnum.RUNNING;
  const taskInstructions = useRef('');

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  useEffect(() => {
    switch (operator) {
      case Operator.RemoteComputer:
        updateSetting({ ...settings, operator: Operator.RemoteComputer });
        break;
      case Operator.RemoteBrowser:
        updateSetting({ ...settings, operator: Operator.RemoteBrowser });
        break;
      case Operator.LocalComputer:
        updateSetting({ ...settings, operator: Operator.LocalComputer });
        break;
      case Operator.LocalBrowser:
        updateSetting({ ...settings, operator: Operator.LocalBrowser });
        break;
      default:
        updateSetting({ ...settings, operator: Operator.LocalComputer });
        break;
    }
  }, [operator]);

  const autoExportTask = async () => {
    if (!taskInstructions.current) return;
    const instruction = taskInstructions.current;
    taskInstructions.current = '';
    const chatMessages =
      (await chatManager.getSessionMessages(sessionId)) || [];
    const chatList = chatMessages || [];
    const lastHumanMessageIndex = [...chatList]
      .reverse()
      .findIndex((m) => m?.from === 'human' && m?.value !== IMAGE_PLACEHOLDER);
    if (lastHumanMessageIndex < 0) return;

    const messages = chatList.slice(
      chatList.length - lastHumanMessageIndex - 1,
    );
    const id = sessionId.split('_').reverse()[0];
    try {
      const res = await window.electron.task.exportTask({
        data: {
          ...restUserData,
          sessionId: id,
          status,
          conversations: messages,
          modelDetail: {
            name: settings.vlmModelName,
            provider: settings.vlmProvider,
            baseUrl: settings.vlmBaseUrl,
            maxLoop: settings.maxLoopCount,
          },
          instruction,
        },
        folder: `/logs/${id}`,
      });
      if (res?.details) {
        console.log(`导出任务失败: ${res.details}`);
      }
    } catch (error) {
      console.log(
        `导出任务失败: ${error instanceof Error ? error.message : error}`,
      );
    }
  };

  const onTaskEnd = async () => {
    await autoExportTask();
    startRun();
  };

  useEffect(() => {
    if (status === StatusEnum.INIT) {
      return;
    }
    if (
      taskInstructions.current &&
      [
        StatusEnum.END,
        StatusEnum.MAX_LOOP,
        StatusEnum.ERROR,
        StatusEnum.USER_STOPPED,
      ].includes(status)
    ) {
      onTaskEnd();
    }
  }, [status]);

  const getInstantInstructions = () => {
    if (tasks.length) {
      return tasks[0];
    }
    if (isCallUser && savedInstructions?.trim()) {
      return savedInstructions;
    }
    return '';
  };

  // console.log('running', 'status', status, running);

  const startRun = async () => {
    if (checkBeforeRun) {
      const checked = await checkBeforeRun();

      if (!checked) {
        return;
      }
    }

    const instructions = getInstantInstructions();
    if (!instructions) {
      return;
    }

    console.log('startRun', instructions, restUserData);

    const history = chatMessages;
    if (status !== StatusEnum.CALL_USER) {
      taskInstructions.current = instructions;
    }
    const session = await getSession(sessionId);
    await updateSession(sessionId, {
      name: instructions,
      meta: {
        ...session!.meta,
        ...(restUserData || {}),
      },
    });
    const newTasks = [...tasks];
    newTasks.splice(0, 1);
    setTasks(newTasks);
    run(instructions, history, () => {
      setLocalInstructions('');
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) {
      return;
    }

    // `enter` to submit
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.metaKey &&
      getInstantInstructions()
    ) {
      e.preventDefault();

      startRun();
    }
  };

  const isCallUser = useMemo(() => status === StatusEnum.CALL_USER, [status]);

  const lastHumanMessage =
    [...(messages || [])]
      .reverse()
      .find((m) => m?.from === 'human' && m?.value !== IMAGE_PLACEHOLDER)
      ?.value || '';

  const stopRun = async () => {
    await stopAgentRuning(() => {
      setLocalInstructions('');
      setTasks([]);
    });
    await api.clearHistory();
  };

  const readonly = useMemo(() => {
    return running || disabled || !!taskInstructions.current;
  }, [running, disabled, taskInstructions.current]);

  const renderButton = () => {
    if (running) {
      return (
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8"
          onClick={stopRun}
        >
          <Square className="h-4 w-4" />
        </Button>
      );
    }

    if (isCallUser && !localInstructions) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-pink-100 hover:bg-pink-200 text-pink-500 border-pink-200"
                onClick={startRun}
                disabled={!getInstantInstructions()}
              >
                <Play className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="whitespace-pre-line">
                send last instructions when you done for ui-tars&apos;s
                &apos;CALL_USER&apos;
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <Button
        variant="secondary"
        size="icon"
        className="h-8 w-8"
        onClick={startRun}
        disabled={!getInstantInstructions() || readonly}
      >
        <Send className="h-4 w-4" />
      </Button>
    );
  };

  const handleInputChange = (val: string) => {
    setTasks(val.split('|'));
    setLocalInstructions(val);
  };

  return (
    <div className="px-4 w-full">
      <div className="flex flex-col space-y-4">
        <div className="relative w-full">
          <Textarea
            ref={textareaRef}
            placeholder={
              isCallUser && savedInstructions
                ? `${savedInstructions}`
                : running && lastHumanMessage && messages?.length > 1
                  ? lastHumanMessage
                  : 'What can I do for you today?'
            }
            className="min-h-[120px] rounded-2xl resize-none px-4 pb-16" // 调整内边距
            value={localInstructions}
            disabled={readonly}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="absolute right-4 bottom-4 flex items-center gap-2">
            {running && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {renderButton()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
