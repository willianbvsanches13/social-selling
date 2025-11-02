#!/bin/bash

# Payload exato do último webhook
PAYLOAD='{"object":"instagram","entry":[{"time":1762021299932,"id":"17841400538867190","messaging":[{"sender":{"id":"1129842642640637"},"recipient":{"id":"17841400538867190"},"timestamp":1762020315339,"message":{"mid":"aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlEOjE3ODQxNDAwNTM4ODY3MTkwOjM0MDI4MjM2Njg0MTcxMDMwMTI0NDI1ODU5OTE3NTI2OTQwODg3NjozMjUwMzUzNzgwOTczNzAyNzc4NDE5MDU4NzUxMTUwNDg5NgZDZD","text":"Oi"}}]}]}'

# App Secret
APP_SECRET='8dce0a9be202a564061968aa1a58dcfa'

# Calcular signature SHA256 (o que Instagram enviaria)
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$APP_SECRET" | sed 's/^.* //')

echo "================================================================================"
echo "TESTE: Enviar webhook ATRAVÉS DO NGINX"
echo "================================================================================"
echo ""
echo "Payload length: ${#PAYLOAD} bytes"
echo "SHA256 calculado: sha256=$SIGNATURE"
echo ""
echo "Enviando para https://api.app-socialselling.willianbvsanches.com/api/instagram/webhooks"
echo ""

# Enviar webhook ATRAVÉS DO NGINX
curl -X POST https://api.app-socialselling.willianbvsanches.com/api/instagram/webhooks \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=$SIGNATURE" \
  -H "x-hub-signature: sha1=fffd11b8219cc2d0d5f1aef8846c62ea0477f11c" \
  -d "$PAYLOAD" \
  -v

echo ""
echo "================================================================================"
echo "Verificar logs do backend"
echo "================================================================================"

sleep 2
docker logs social-selling-backend --tail 15 | grep -E "(Webhook signature|VALID|signature verification)"
