import { Slider } from "@/components/ui/slider";
import cn from "@/lib/utils";
import { useSettings } from "@/stores/useSettings";

const MetricSlider = () => {
    const { isEnabled, qualityThreshold, setThreshold } = useSettings();

    return (
        <Slider
            min={0}
            max={100}
            value={qualityThreshold}
            step={0.1}
            className={cn([
                "w-full"
            ])}
            onValueChange={(value) => {
                setThreshold(Math.round(Number(value) / 5) * 5);
            }}
            disabled={!isEnabled}
        />
    );
};

export default MetricSlider;
