#!/bin/bash

# Interactive script to add environment variables following best practices
# This ensures all necessary files are updated consistently

set -e

echo "🔐 Environment Variable Addition Wizard"
echo "========================================"
echo ""

# Check if running from project root
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Function to add variable to .env.example
add_to_env_example() {
    local var_name=$1
    local var_value=$2
    local var_description=$3
    local var_category=$4

    echo ""
    echo "# $var_description" >> .env.example
    echo "$var_name=$var_value" >> .env.example
    echo "✅ Added to .env.example"
}

# Function to show services that need the variable
show_services_prompt() {
    echo ""
    echo "Which services need this variable?"
    echo "1) Backend only"
    echo "2) Worker only"
    echo "3) Backend + Worker"
    echo "4) Backend + Worker + Frontend"
    echo "5) Custom selection"
    read -p "Choice (1-5): " service_choice
    echo ""

    case $service_choice in
        1) echo "backend";;
        2) echo "worker";;
        3) echo "backend worker";;
        4) echo "backend worker frontend";;
        5)
            read -p "Enter services (space-separated): " custom_services
            echo "$custom_services"
            ;;
        *) echo "backend worker";;
    esac
}

# Collect information
echo "📝 Step 1: Variable Information"
echo "--------------------------------"
read -p "Variable name (e.g., SMTP_HOST): " VAR_NAME

if [ -z "$VAR_NAME" ]; then
    echo "❌ Variable name cannot be empty"
    exit 1
fi

# Check if already exists
if grep -q "^$VAR_NAME=" .env.example 2>/dev/null; then
    echo "⚠️  Warning: $VAR_NAME already exists in .env.example"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

read -p "Description: " VAR_DESCRIPTION
read -p "Default/Example value: " VAR_VALUE
echo ""

echo "Variable type:"
echo "1) Secret/Password (will be auto-generated)"
echo "2) API Key (requires manual setup)"
echo "3) Configuration (has default value)"
echo "4) Optional (has default value, not required)"
read -p "Type (1-4): " VAR_TYPE
echo ""

# Determine if required and if needs generation
IS_REQUIRED=false
IS_SECRET=false
NEEDS_GENERATION=false

case $VAR_TYPE in
    1)
        IS_REQUIRED=true
        IS_SECRET=true
        NEEDS_GENERATION=true
        ;;
    2)
        IS_REQUIRED=true
        IS_SECRET=true
        ;;
    3)
        IS_REQUIRED=true
        ;;
    4)
        IS_REQUIRED=false
        ;;
esac

# Get services
SERVICES=$(show_services_prompt)

# Summary
echo "📋 Summary"
echo "----------"
echo "Variable Name: $VAR_NAME"
echo "Description: $VAR_DESCRIPTION"
echo "Default Value: $VAR_VALUE"
echo "Type: $([ $VAR_TYPE -eq 1 ] && echo "Secret/Password" || [ $VAR_TYPE -eq 2 ] && echo "API Key" || [ $VAR_TYPE -eq 3 ] && echo "Configuration" || echo "Optional")"
echo "Required: $IS_REQUIRED"
echo "Services: $SERVICES"
echo ""
read -p "Proceed with these settings? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

echo ""
echo "🔧 Adding variable to all necessary files..."
echo ""

# 1. Add to .env.example
echo "1️⃣  Updating .env.example..."
echo "" >> .env.example
echo "# $VAR_DESCRIPTION" >> .env.example
echo "$VAR_NAME=$VAR_VALUE" >> .env.example
echo "✅ Added to .env.example"
echo ""

# 2. Add to docker-compose.yml
echo "2️⃣  Updating docker-compose.yml..."
echo "⚠️  Note: You need to manually add to docker-compose.yml"
echo ""
echo "Add this to the 'environment:' section of these services: $SERVICES"
echo ""
echo "  $VAR_NAME: \${$VAR_NAME}"
echo ""
read -p "Press Enter to continue after you've added it manually..."
echo ""

# 3. Add to check-env.sh
if [ "$IS_REQUIRED" = true ]; then
    echo "3️⃣  Updating scripts/check-env.sh..."

    # Backup
    cp scripts/check-env.sh scripts/check-env.sh.backup

    # Add to REQUIRED_VARS
    sed -i.tmp "/^REQUIRED_VARS=(/a\\
    \"$VAR_NAME\"" scripts/check-env.sh

    # Add to NO_DEFAULT_VARS if secret
    if [ "$IS_SECRET" = true ]; then
        sed -i.tmp "/^NO_DEFAULT_VARS=(/a\\
    \"$VAR_NAME\"" scripts/check-env.sh
    fi

    rm scripts/check-env.sh.tmp 2>/dev/null || true
    echo "✅ Added to check-env.sh"
else
    echo "3️⃣  Skipping check-env.sh (optional variable)"
fi
echo ""

# 4. Add to generate-keys.sh
if [ "$NEEDS_GENERATION" = true ]; then
    echo "4️⃣  Updating scripts/generate-keys.sh..."
    echo "⚠️  Note: You need to manually add generation logic"
    echo ""
    echo "Add this before the final echo:"
    echo ""
    echo "echo \"# $VAR_DESCRIPTION\""
    echo "echo \"$VAR_NAME=\$(openssl rand -base64 32 | tr -d '\\n')\""
    echo "echo \"\""
    echo ""
    read -p "Press Enter to continue after you've added it manually..."
else
    echo "4️⃣  Skipping generate-keys.sh (not a generated secret)"
fi
echo ""

# 5. Add to configuration.ts
echo "5️⃣  Updating backend/src/config/configuration.ts..."
echo "⚠️  Note: You need to manually add to configuration.ts"
echo ""
echo "Add this to the appropriate category in the export:"
echo ""
cat << EOF
  categoryName: {
    ${VAR_NAME,,}: process.env.$VAR_NAME || '$VAR_VALUE',
  },
EOF
echo ""
read -p "Press Enter to continue after you've added it manually..."
echo ""

# 6. Add to FIX_PRODUCTION.md
if [ "$IS_REQUIRED" = true ]; then
    echo "6️⃣  Should this be documented in FIX_PRODUCTION.md?"
    read -p "Add to production docs? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "Add this to the 'Variáveis Obrigatórias' section:"
        echo ""
        echo "$VAR_NAME=$VAR_VALUE    # $VAR_DESCRIPTION"
        echo ""
        read -p "Press Enter to continue after you've added it manually..."
    fi
else
    echo "6️⃣  Skipping FIX_PRODUCTION.md (optional variable)"
fi
echo ""

# 7. Test
echo "7️⃣  Testing..."
echo ""
echo "Run these commands to test:"
echo ""
echo "  # Add to your local .env"
echo "  echo \"$VAR_NAME=$VAR_VALUE\" >> .env"
echo ""
echo "  # Verify"
echo "  ./scripts/check-env.sh"
echo ""
echo "  # Restart services"
echo "  docker compose restart $SERVICES"
echo ""
echo "  # Check logs"
echo "  docker logs social-selling-backend --tail 50"
echo ""

# Summary of changes
echo "✅ Summary of Changes"
echo "====================="
echo ""
echo "Files updated:"
echo "  ✅ .env.example"
if [ "$IS_REQUIRED" = true ]; then
    echo "  ✅ scripts/check-env.sh"
fi
echo ""
echo "Files that need manual update:"
echo "  ⚠️  docker-compose.yml (services: $SERVICES)"
if [ "$NEEDS_GENERATION" = true ]; then
    echo "  ⚠️  scripts/generate-keys.sh"
fi
echo "  ⚠️  backend/src/config/configuration.ts"
if [ "$IS_REQUIRED" = true ]; then
    echo "  ⚠️  FIX_PRODUCTION.md (if critical)"
fi
echo ""

echo "📚 Next Steps:"
echo ""
echo "1. Complete manual updates in files listed above"
echo "2. Add $VAR_NAME=$VAR_VALUE to your local .env"
echo "3. Run ./scripts/check-env.sh to verify"
echo "4. Test with docker compose restart $SERVICES"
echo "5. Commit changes with descriptive message"
echo ""
echo "See ENV_VARIABLES_RULES.md for complete guidelines"
echo ""

# Restore backup if needed
if [ -f scripts/check-env.sh.backup ]; then
    echo "💾 Backup saved at scripts/check-env.sh.backup"
fi

echo "✨ Done!"
