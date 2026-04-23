
import json
import os
import sys

def main():
    if len(sys.argv) < 2:
        print("Usage: python import_service_account.py <path_to_json_file>")
        sys.exit(1)

    json_path = sys.argv[1]
    if not os.path.exists(json_path):
        print(f"Error: File {json_path} not found")
        sys.exit(1)

    with open(json_path, 'r') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            print("Error: Invalid JSON file")
            sys.exit(1)

    # Convert to single-line string
    json_string = json.dumps(data)
    
    env_line = f"FIREBASE_SERVICE_ACCOUNT_JSON='{json_string}'\n"

    # Update .env or .env.production
    # We'll check for .env in current and parent dir
    env_paths = [
        '.env',
        '../.env',
        '.env.production',
        '../.env.production'
    ]
    
    updated = False
    for path in env_paths:
        if os.path.exists(path):
            with open(path, 'r') as f:
                lines = f.readlines()
            
            # Check if already exists, update it
            new_lines = []
            found = False
            for line in lines:
                if line.startswith('FIREBASE_SERVICE_ACCOUNT_JSON='):
                    new_lines.append(env_line)
                    found = True
                else:
                    new_lines.append(line)
            
            if not found:
                new_lines.append("\n# Firebase Service Account\n")
                new_lines.append(env_line)
            
            with open(path, 'w') as f:
                f.writelines(new_lines)
            
            print(f"✅ Updated {path} with FIREBASE_SERVICE_ACCOUNT_JSON")
            updated = True
    
    if not updated:
        print("⚠️ No .env or .env.production files found to update.")
        print("Please manually add the following line to your environment configuration:")
        print("-" * 20)
        print(env_line)
        print("-" * 20)

if __name__ == "__main__":
    main()
