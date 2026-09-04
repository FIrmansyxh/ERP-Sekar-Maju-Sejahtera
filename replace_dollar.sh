#!/bin/bash
find src/ -type f -name "*.tsx" -exec perl -pi -e 's/<DollarSign className="([^"]+)" \/>/<span className="inline-flex items-center justify-center font-bold leading-none $1">Rp<\/span>/g' {} +
find src/ -type f -name "*.tsx" -exec perl -pi -e 's/import \{([^}]*)DollarSign,([^}]*)\} from .lucide-react.;/import {$1$2} from "lucide-react";/g' {} +
find src/ -type f -name "*.tsx" -exec perl -pi -e 's/import \{([^}]*)DollarSign([^}]*)\} from .lucide-react.;/import {$1$2} from "lucide-react";/g' {} +
