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
  error?: Record<string, unknown>;
};

export type ExportConversationData = ExportDataParams<ConversationData>;

export enum TrajectoryStatusEnum {
  finished,
  retry_finished,
  failed,
}

export type ExportTaskData = {
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
