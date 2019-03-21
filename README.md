# skywai-interactivison
SKYWAY(https://webrtc.ecl.ntt.com/)を利用したインタラクティビジョン用ソフトウェア

# Dependency
JavaScript SDK(https://webrtc.ecl.ntt.com/developer.html)

# Setup
Microsoft App Service のWebAppsにデプロイする前提です。
TemplateDeploymentから下記JSONをテンプレートととして呼び出し、必要事項を入力する。

<pre>
{
  "$schema": "http://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0", 
  "parameters": 
  {
    "WEBサイト名":
    {
      "type": "String",
      "defaultValue": "skyway-USERNAME",
      "metadata":
      {
        "description": "サイト名はhttp(s)://*****.azurewebsites.net/になります"
      }
    },
    "サービスプラン":
    {
      "type": "string",
      "allowedValues":
      [
        "Free      /F1        ",
        "Shared    /D1        ",
        "Basic     /B1        ",
        "Basic     /B2        ",
        "Basic     /B3        ",
        "Standard  /S1        ",
        "Standard  /S2        ",
        "Standard  /S3        ",
        "Premium   /P1        ",
        "Premium   /P2        ",
        "Premium   /P3        ",
        "Premium   /P4        "
      ],
      "defaultValue": "Basic     /B1        "
    },
    "repoURL": {
      "type": "string",
      "defaultValue": "https://github.com/mrkm86/skyway-interactivision.git",
      "metadata": {
      "description": "The URL for the GitHub repository that contains the project to deploy."
      }
    },
    "branch": {
      "type": "string",
      "defaultValue": "master",
      "metadata": {
      "description": "The branch of the GitHub repository to use."
      }
    }
  },
  "variables":
  {
    "location": "[resourceGroup().location]",
    "websitename": "[parameters('WEBサイト名')]",
    "websiteurl": "[concat(parameters('WEBサイト名'),'.azurewebsites.net')]",
    "appserviceplanname": "[concat(parameters('WEBサイト名'),'-SERVICEPLAN')]",
    "workerSize": "0"
  },
  "resources": 
  [
    {
      "type": "Microsoft.Web/serverfarms",
      "sku":
      {
        "name": "[trim(substring(parameters('サービスプラン'),11, 10))]",
        "tier": "[trim(substring(parameters('サービスプラン'), 0, 10))]",
        "size": "[trim(substring(parameters('サービスプラン'),11, 10))]",
        "family": "[substring(parameters('サービスプラン'),11, 1)]",
        "capacity": "[substring(parameters('サービスプラン'),12, 1)]"
      },
      "name": "[variables('appserviceplanname')]",
      "apiVersion": "2015-08-01",
      "location": "[variables('location')]",
      "properties":
      {
        "name": "[variables('appserviceplanname')]",
        "numberOfWorkers": 1
      },
      "dependsOn": []
        },
    {
      "type": "Microsoft.Web/sites",
      "name": "[variables('websitename')]",
      "location": "[variables('location')]",
      "apiVersion": "2015-08-01",
      "properties":
      {
        "name": "[variables('websitename')]",
        "hostNames":"[variables('websiteurl')]",
        "serverFarmId": "[resourceId('Microsoft.Web/serverfarms', variables('appserviceplanname'))]",
        "RepoUrl": "[parameters('repoURL')]",
        "branch": "[parameters('branch')]",
        "IsManualIntegration": false
      },
      "resources": [
        {
          "apiVersion": "2015-08-01",
          "name": "web",
          "type": "sourcecontrols",
          "dependsOn": [
          "[resourceId('Microsoft.Web/Sites', parameters('WEBサイト名'))]"
          ],
          "properties": {
          "RepoUrl": "[parameters('repoURL')]",
          "branch": "[parameters('branch')]",
          "IsManualIntegration": false
          }
        }
      ],
      "dependsOn":
      [
        "[resourceId('Microsoft.Web/serverfarms', variables('appserviceplanname'))]"
      ]
    }
  ]
}
</pre>
