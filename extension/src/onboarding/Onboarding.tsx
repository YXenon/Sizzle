import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { LocalStorage } from "@/lib/storage";
import { ConnectionStates, FileProgress } from "@/lib/types";
import {
    MessageAction,
    onRuntimeMessage,
    sendRuntimeNotification,
} from "@/messaging";
import { useSettings } from "@/stores/useSettings";

const RETRY_COOLDOWN_MS = 10_000;
const CLOSE_DELAY_MS = 5_000;
const LEARN_MORE_URL = "https://example.com";
const REPORT_ISSUE_URL = "https://example.com";

const bytesToReadable = (size: number) => {
    if (size <= 1_000_000) {
        return `${(size / 1_000).toFixed(2)} KB`;
    }
    return `${(size / 1_000_000).toFixed(2)} MB`;
};

const FileIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="30"
        height="23"
        viewBox="0 0 24 24"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary fill-none w-auto shrink-0"
        aria-hidden="true"
    >
        <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
        <path d="M14 2v5a1 1 0 0 0 1 1h5" />
    </svg>
);

const DownloadIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="font-google-regular fill-none stroke-primary"
        aria-hidden="true"
    >
        <path d="M12 17V3" />
        <path d="m6 11 6 6 6-6" />
        <path d="M19 21H5" />
    </svg>
);

const ExternalLinkIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="fill-none stroke-primary"
        aria-hidden="true"
    >
        <path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
        <path d="m21 3-9 9" />
        <path d="M15 3h6v6" />
    </svg>
);

const AssetCard = ({
    fileName,
    progress,
    sizeBytes,
}: {
    fileName: string;
    progress: number;
    sizeBytes: number;
}) => {
    const safeProgress = Number.isFinite(progress) ? progress : 0;
    const fixedProgress = Math.floor(Math.min(Math.max(safeProgress, 0), 100));

    return (
        <div className="dark w-full py-1 px-2 flex flex-col shrink-0 items-center justify-center bg-popover border border-ring/20 rounded-md relative overflow-hidden">
            <div
                className="h-full bg-green-600/20 absolute top-0 left-0 z-1 rounded-md transition-all"
                style={{ width: `${fixedProgress}%` }}
            />

            <div className="w-full flex items-center z-2 gap-x-2 min-w-0">
                <FileIcon />
                <div className="h-full flex flex-col justify-center items-start min-w-0 grow *:leading-4">
                    <span className="font-google-medium text-sm text-ellipsis text-primary whitespace-nowrap overflow-hidden max-w-full">
                        {fileName}
                    </span>
                    {sizeBytes > 0 && (
                        <span className="font-google-regular text-primary text-[12px]">
                            {bytesToReadable(sizeBytes)}
                        </span>
                    )}
                </div>
                <div className="flex items-center justify-center shrink-0">
                    <span className="font-google-medium text-[12px] text-primary leading-0 tabular-nums">
                        {fixedProgress}%
                    </span>
                </div>
            </div>
        </div>
    );
};

const OnboardingScreenOne = ({
    setScreen,
}: {
    setScreen: React.Dispatch<React.SetStateAction<number>>;
}) => {
    const startDownload = useCallback(async () => {
        setScreen((prev) => prev + 1);
        await sendRuntimeNotification(MessageAction.StartSetup);
    }, [setScreen]);

    return (
        <motion.div
            className="p-2 w-sm sm:w-1/2 h-full flex flex-col items-center justify-center gap-4"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <span className="font-google-medium text-justify [text-align-last:center] leading-5 w-4/5">
                <span className="block text-3xl sm:text-5xl text-center font-google-bold mb-4">
                    Thanks For Using <span className="text-sizzle">Sizzle</span>{" "}
                    :)
                </span>
                Some essential files need to be downloaded for the extension to
                work. They're safe, so please don't close this tab or the
                browser during the installation. Everything will setup
                automatically. You can read more about it{" "}
                <a
                    href={LEARN_MORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                >
                    here
                </a>
                .
            </span>
            <Button variant="secondary" onClick={startDownload}>
                <DownloadIcon />
                Download Files
            </Button>
        </motion.div>
    );
};

const OnboardingScreenTwo = () => {
    const [filesProgress, setFileProgress] = useState<FileProgress[]>([]);
    const [isRetrying, setIsRetrying] = useState(false);
    const { setBoarding } = useSettings();
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

    const reportIssue = useCallback(() => {
        window.open(REPORT_ISSUE_URL, "_blank", "noopener,noreferrer");
    }, []);

    const retry = useCallback(async () => {
        if (isRetrying) return;
        setIsRetrying(true);
        try {
            await sendRuntimeNotification(MessageAction.StartSetup);
        } finally {
            retryTimeoutRef.current = setTimeout(() => {
                setIsRetrying(false);
            }, RETRY_COOLDOWN_MS);
        }
    }, [isRetrying]);

    useEffect(() => {
        const unsubscribeProgress = onRuntimeMessage(
            MessageAction.SetupProgress,
            (progress) => {
                setFileProgress((prev) =>
                    Array.from(
                        new Map(
                            [...prev, ...progress.files].map((f) => [
                                f.name,
                                f,
                            ]),
                        ).values(),
                    ),
                );
            },
        );

        const unsubscribeComplete = onRuntimeMessage(
            MessageAction.SetupComplete,
            (_payload) => {
                setBoarding(false);
                closeTimeoutRef.current = setTimeout(() => {
                    window.close();
                }, CLOSE_DELAY_MS);
            },
        );

        return () => {
            unsubscribeProgress();
            unsubscribeComplete();
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        };
    }, [setBoarding]);

    return (
        <motion.div
            className="w-80 h-52 flex flex-col justify-center items-center bg-popover rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="p-2 w-full grow flex flex-col gap-2 overflow-y-scroll scrollbar-hidden">
                {filesProgress.length !== 0 ? (
                    filesProgress.map((file) => (
                        <AssetCard
                            fileName={file.name}
                            progress={
                                file.total > 0
                                    ? (file.loaded / file.total) * 100
                                    : 0
                            }
                            sizeBytes={file.total}
                            key={file.name}
                        />
                    ))
                ) : (
                    <div className="flex items-center justify-center">
                        <span className="font-google-medium text-primary">
                            Downloading files will be listed here.
                        </span>
                    </div>
                )}
            </div>
            <div className="w-full p-2 flex items-center justify-center gap-x-1">
                No progress?
                <Button
                    variant="secondary"
                    onClick={retry}
                    disabled={isRetrying || true}
                    aria-label="Retry download"
                >
                    Retry
                </Button>
                or
                <Button
                    variant="outline"
                    onClick={reportIssue}
                    aria-label="Report an issue"
                >
                    <ExternalLinkIcon />
                    Report Issue
                </Button>
            </div>
        </motion.div>
    );
};

function Onboarding() {
    const [screen, setScreen] = useState(1);

    useEffect(() => {
        const getConnectionState = async () => {
            const { connection_state } = await LocalStorage.get([
                "connection_state",
            ]);
            if (
                connection_state === undefined ||
                connection_state === ConnectionStates.Idle
            ) {
                setScreen(1);
                return;
            }
            if (connection_state === ConnectionStates.Completed) {
                window.close();
                return;
            }
            setScreen(2);
        };
        getConnectionState();
    }, []);

    return (
        <div className="dark w-full h-full bg-[#101214] text-white flex items-center justify-center overflow-hidden relative font-sans selection:bg-red-500/30">
            <div className="w-full h-full flex items-center justify-center">
                <AnimatePresence mode="wait" initial={false}>
                    {screen === 2 ? (
                        <OnboardingScreenTwo key="screen_two" />
                    ) : (
                        <OnboardingScreenOne
                            setScreen={setScreen}
                            key="screen_one"
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default Onboarding;
