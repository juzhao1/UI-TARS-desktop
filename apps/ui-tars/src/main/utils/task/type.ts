import { ConversationWithSoM } from '@/main/shared/types';
import { ActionInputs } from '@ui-tars/shared/types';

export interface ExportDataParams<T = unknown> {
  data: T;
  filename: string;
  folder?: string;
  options?: { pretty?: boolean; encoding?: BufferEncoding };
}

export interface ModalInfo {
  name?: string;
  provider?: string;
  baseUrl?: string;
  maxLoop?: number;
}

export type ConversationData = {
  sessionId: string;
  instruction: string;
  status: string;
  conversations: ConversationWithSoM[];
  modelDetail: ModalInfo;
  // SessionMetaInfo
  operator?: string;
  version?: string;
  logTime?: number;
  systemPrompt?: string;
  modelName?: string;
  error?: unknown;
};

export type ExportConversationData = ExportDataParams<ConversationData>;
export type ExportCurrentConversationData = {
  data: ConversationData;
  folder?: string;
  options?: { pretty?: boolean; encoding?: BufferEncoding };
};

export enum TrajectoryStatusEnum {
  finished,
  retry_finished,
  failed,
}

export type TaskData = {
  os: string;
  episode_id: string;
  screen_resolution: Electron.Size;
  instruction: string;
  trajectory: {
    observation: string | undefined;
    observation_annotation: string | undefined;
    think: string;
    step_id: number;
    action: string;
    action_type?: string;
    action_inputs?: ActionInputs;
  }[];
  trajectory_type: TrajectoryStatusEnum;
};
