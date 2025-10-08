"use client"

import useConversation from "@/hooks/use-conversation";
import axios from "axios";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import MessageInput from "./message-input";
import { CldUploadButton } from "next-cloudinary";
import IconWithHover from "./image-icon";
import SendWithHover from "./send-icon";
import { useSession } from "next-auth/react";

const Form = () => {
    const { supportId } = useConversation();
    const { data: session } = useSession();

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors }
    } = useForm<FieldValues>({
        defaultValues: {
            message: ''
        }
    });

    const isChatBlocked = session?.user?.isChatBlocked;

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        if (isChatBlocked) return;

        setValue('message', '', { shouldValidate: true });
        axios.post('/api/messages', {
            ...data,
            supportId
        });
    };

    const handleUpload = (result: any) => {
        if (isChatBlocked) return;

        axios.post('/api/messages', {
            image: result?.info?.secure_url,
            supportId
        });
    };

    return (
        <div className="flex gap-5 w-full fixed bottom-0 left-0 bg-black px-4 py-2">
            {!isChatBlocked ? (
                <CldUploadButton
                    options={{ maxFiles: 1 }}
                    uploadPreset="s9xneoe8"
                    onSuccess={handleUpload}
                >
                    <IconWithHover />
                </CldUploadButton>
                ) : (
                <IconWithHover isDisabled={isChatBlocked} />
            )}

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex gap-5 w-full"
            >
                <MessageInput
                    id="message"
                    register={register}
                    errors={errors}
                    required
                    placeholder={isChatBlocked ? "You are chat blocked" : "Write a message"}
                    disabled={isChatBlocked}
                    maxLength={5000}
                />
                <button
                    type="submit"
                    disabled={isChatBlocked}
                >
                    <SendWithHover isDisabled={isChatBlocked} />
                </button>
            </form>
        </div>
    );
};

export default Form;