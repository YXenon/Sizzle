import { Button } from "@/components/ui/button";
const Footer = () => {
    return (
        <div className="w-full flex justify-center gap-2 p-5 pt-0">
            <Button
                className="transition-colors duration-300 w-1/2 text-[12px] font-google_bold font-bold flex justify-center items-center uppercase"
                onClick={() => {
                    window.open("https://example.com", "_blank");
                }}
            >
                How to use
            </Button>
            <Button
                className="transition-colors duration-300 w-1/2 text-[12px] font-google_bold font-bold flex justify-center items-center uppercase"
                onClick={() => {
                    window.open("https://example.com", "_blank");
                }}
            >
                Report issue
            </Button>
        </div>
    );
};

export default Footer;
