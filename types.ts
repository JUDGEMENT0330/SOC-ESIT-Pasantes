
import React from 'react';

export interface TerminalLine {
    text?: string;
    html?: string;
    type: 'command' | 'output' | 'error' | 'title' | 'prompt' | 'html';
}

export interface PromptState {
    user: string;
    host: string;
    dir: string;
}

export interface TrainingScenario {
    id: string;
    icon: string;
    color: string;
    title: string;
    subtitle: string;
    content: React.ReactNode;
}

export interface ResourceModule {
    id: string;
    icon: string;
    title: string;
    content: React.ReactNode;
}

export interface GlossaryTerm {
    term: string;
    definition: string;
}

export interface LogEntry {
    id: number;
    timestamp: string;
    source: 'Red Team' | 'Blue Team' | 'System';
    message: string;
    teamVisible: 'all' | 'red' | 'blue';
}

export interface TrainingModuleProps {
    scenario: TrainingScenario;
    isCompleted: boolean;
    onToggleComplete: (scenarioId: string) => void;
}
