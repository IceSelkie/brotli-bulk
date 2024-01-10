#!/bin/bash

# Directories
LOCAL_TODO_DIR="./to_compress"
LOCAL_DONE_DIR="./done_compressing"
REMOTE_NAME="BROTLI"
REMOTE_INPUT_DIR="brotli/input"
REMOTE_OUTPUT_DIR="brotli/output"

# File to track currently processing files
PROCESSING_FILE="./processing_files.txt"

# Ensure directories exist:
mkdir -p "${LOCAL_TODO_DIR}"
mkdir -p "${LOCAL_DONE_DIR}"

# Main loop
while true; do
    files_to_process=($(ls $LOCAL_TODO_DIR))
    processing_files=($(cat "$PROCESSING_FILE"))

    action_taken=false

    # Check if there are no more local files to process
    if [ ${#files_to_process[@]} -eq 0 ] && [ ${#processing_files[@]} -eq 0 ]; then
        echo "No more local files to process."
        continue
    fi

    # Upload files if there's room in the remote input directory
    file_count=$(ssh "${REMOTE_NAME}" ls -1 ${REMOTE_INPUT_DIR} | wc -l)
    if [ "$file_count" -lt 20 ]; then
        for file in "${files_to_process[@]}"; do
            # Skip if the file is already being processed
            if [[ ! " ${processing_files[@]} " =~ " ${file} " ]]; then
                # Add file to processing list
                echo "$file" >> "$PROCESSING_FILE"

                scp "${LOCAL_TODO_DIR}/${file}" "${REMOTE_NAME}:${REMOTE_INPUT_DIR}/"
                echo "Transferred ${file} to BROTLI:input"
                action_taken=true

                # Break after uploading one file to recheck server space
                break
            fi
        done
    fi

    # Check for and download compressed files
    for file in "${processing_files[@]}"; do
        if [ "$(ssh "${REMOTE_NAME}" "test -e ${REMOTE_OUTPUT_DIR}/${file}.br && echo exists")" = "exists" ]; then
            # Transfer the file from BROTLI:output to done_compressing
            scp "${REMOTE_NAME}:${REMOTE_OUTPUT_DIR}/${file}.br" "${LOCAL_DONE_DIR}/"
            ssh "${REMOTE_NAME}" rm "${REMOTE_OUTPUT_DIR}/${file}.br"
            echo "Transferred ${file} from BROTLI:output to done_compressing"

            # Integrity check
            original_hash=$(shasum -a 256 "${LOCAL_TODO_DIR}/${file}" | cut -d ' ' -f1)
            compressed_hash=$(./compressedHash.js ${LOCAL_DONE_DIR}/${file}.br | cut -d ' ' -f1)

            if [ "$original_hash" == "$compressed_hash" ]; then
                echo "Integrity check passed for ${file}.br"
                rm "${LOCAL_TODO_DIR}/${file}" # Delete the original file
            else
                echo "Integrity check failed for ${file}.br:"
                echo "  orighash $original_hash"
                echo "  comphash $compressed_hash"
            fi

            # Remove file from processing list
            sed -i '' "/$file/d" "$PROCESSING_FILE"
            action_taken=true
        fi
    done

    # Wait before checking again
    if $file_action_taken; then
        sleep 0
    else
        sleep 5
    fi
done

