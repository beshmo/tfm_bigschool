{{- define "okvns.namespace" -}}
{{- default .Release.Namespace .Values.namespace.name -}}
{{- end -}}

{{- define "okvns.partOf" -}}
{{- default "okvns" .Values.partOf -}}
{{- end -}}

{{- define "okvns.apiImage" -}}
{{- printf "%s:%s" .Values.api.image.repository .Values.api.image.tag -}}
{{- end -}}

{{- define "okvns.adminWebImage" -}}
{{- printf "%s:%s" .Values.adminWeb.image.repository .Values.adminWeb.image.tag -}}
{{- end -}}

{{- define "okvns.mysqlImage" -}}
{{- printf "%s:%s" .Values.mysql.image.repository .Values.mysql.image.tag -}}
{{- end -}}
