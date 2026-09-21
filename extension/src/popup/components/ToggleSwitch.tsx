import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/stores/useSettings";

const ToggleSwitch = () => {
    const { isEnabled, setEnabled } = useSettings();
    return (
        <Switch
            defaultChecked={isEnabled}
            onCheckedChange={(checked) => {
                setEnabled(checked);
            }}
        ></Switch>
    );
};

export default ToggleSwitch;
