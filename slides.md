---
theme: apple-basic
layout: intro
---

# Hosting Open-Source Translation Models on AWS SageMaker for Automated Blog Localization

<div class="absolute bottom-10">
  <span class="font-700">
    Cody Bontecou
  </span>
</div>

<!--
Creating multilingual content is often tedious and expensive.

Let’s automate it into our blog's build process!

In this presentation, I'll take you through:
- Deploying an open-source text-to-text translation (T2TT) model on AWS SageMaker
- Automating the translations during our blog's build

Automate the internationalization of our blog, enabling it to be read in nearly 100 languages.
-->



---
layout: intro-image-right
image: 'https://i.imgur.com/xCKI9kI.png'
---

# Why AWS SageMaker?

<div class="py-4">Build ML Your Way - Notebooks, AutoML, or Custom Models</div>

* Flexible
* Scalable
* Cost-efficient
* Integration with AWS ecosystem
* Excellent developer Experience

<!--
SageMaker is AWS's managed platform that simplifies building, training, and deploying machine learning models for developers and data scientists.

* Flexibility: Easily host pre-trained models like Hugging Face transformers.
* Scalability: Automated scaling and easy to scale via compute options.
* Cost-efficient: Pay only for what you use & auto-shutdown.
* Integration with AWS ecosystem: Perfect for end-to-end workflows.
* Developer Experience: Well-documented and easy to use SDK's.
-->

---
layout: intro-image
image: 'https://i.imgur.com/ZGeYKTK.gif'
---

<!--
To create an AWS IAM role for your SageMaker application, follow these steps:

#### Step 1: Log in to AWS Management Console

1. Go to the **IAM** service in the AWS Management Console.

#### Step 2: Create a New Role

1. In the IAM dashboard, click on **Roles** in the left-hand menu.
2. Click the **Create Role** button.

#### Step 3: Select the Trusted Entity

1. Choose **AWS Service** as the trusted entity type.
2. Under "Use case," select **SageMaker** and click **Next**.

#### Step 4: Attach Policies

1. Attach the necessary policies to allow SageMaker to access resources like S3 and other AWS services:
	- **AmazonSageMakerFullAccess**: Provides full access to SageMaker features.
2. Click **Next**.

#### Step 5: Name and Review

1. Give your role a meaningful name, e.g., `SageMakerExecutionRole`.
2. Review the details and click **Create Role**.

#### Step 6: Copy the Role ARN

1. Find your new role in the list of roles on the IAM dashboard.
2. Click on the role name to open its details.
3. Copy the **Role ARN** (it will look something like `arn:aws:iam::123456789012:role/SageMakerExecutionRole`).
-->


---
layout: section
---


# The Model
<!-- With our AWS permissions setup, it's now time to play with AI -->


---
layout: default
---

# SeamlessM4T v2

### SeamlessM4T supports:

- 101 languages for speech input
- 96 languages for text input/output
- 35 languages for speech output

### SeamlessM4T tasks:

* Speech recognition (ASR)
* Speech-to-text translation (S2TT)
* Speech-to-speech (S2ST)
* Text-to-text (T2TT)
* Text-to-speech (T2ST)


<div class="absolute bottom-10">
  <span class="font-700">
    facebook/seamless-m4t-v2-large
  </span>
</div>

<!--
A benefit of SeamlessM4T v2 over Facebook's other T2TT model, NLLB, is that Seamless maintains the structure of the text, in my case, the markdown structure.

A future project may be pre-proccessing and post-processing the markdown alongside NLLB for potentially better translations.
-->

---
layout: default
---

# Differences in FB T2TT models
### ChrF++ (Character n-gram F-score) is a metric used to evaluate machine translation quality that builds upon the original ChrF metric.

| Direction | facebook/seamless-m4t-v2-large | facebook/nllb-200-3.3B | Difference |
|-----------|-----------------|------------|------------|
| eng-afr   | 64.47          | 64.7       | -0.23      |
| eng-amh   | 38.31          | 37.9       | +0.41      |
| eng-arb   | 54.92          | 55.0       | -0.08      |
| eng-ary   | 37.31          | 36.1       | +1.21      |
| eng-arz   | 44.85          | 44.8       | +0.05      |


https://dl.fbaipublicfiles.com/seamless/metrics/seamlessM4T_large_v2.zip

https://dl.fbaipublicfiles.com/large_objects/nllb/models/nllb_200_dense_3b/metrics.csv

<!--
Performance comparison between Facebooks main T2TT models.

A future project may want to use both models, utilizing the benefits of both.

Ex:
- Translate using whichever model has the higher chrf++ score.
- Translate to language pairs that is unique to the model.
-->


---
layout: statement
---

# Deploying the model

<!--
With our permissions set up and our model chosen, it's time to put it online.
-->

---
layout: section
---

# Python environment

```python
uv venv --python 3.11.6
source .venv/bin/activate
uv add sagemaker
```

> Note: The SageMaker SDK only supports Python versions 3.8, 3.9,3.10, and 3.11.

<!--
The Javascript SDK does not support model deployment, so I we'll use a single Python script for this.

Hugging Face and SageMaker make deploying the model simple enough to manage within a single script, so delegating this piece of the project to Python is acceptable.
-->

---
layout: default
---

# Hugging Face + Sagemaker = 🫶

![hugging face deploy to sagemaker code generation](https://i.imgur.com/CONPAzl.gif)

<!--
Hugging Face provides code to deploy model's to SageMaker.
-->

---
layout: default
---

```python {*|4-9|11-15|13|14|17-24|26-30}{maxHeight: '1200px'}
import sagemaker
import boto3
from sagemaker.huggingface import HuggingFaceModel

try:
    role = sagemaker.get_execution_role()
except ValueError:
    iam = boto3.client("iam")
    role = iam.get_role(RoleName="SageMakerRole")["Role"]["Arn"]

# Hub Model configuration. https://huggingface.co/models
hub = {
    "HF_MODEL_ID": "facebook/seamless-m4t-v2-large",
    "HF_TASK": "translation",
}

# create Hugging Face Model Class
huggingface_model = HuggingFaceModel(
    transformers_version="4.37.0",
    pytorch_version="2.1.0",
    py_version="py310",
    env=hub,
    role=role,
)

# deploy model to SageMaker Inference
predictor = huggingface_model.deploy(
    initial_instance_count=1,  # number of instances
    instance_type="ml.m5.xlarge",  # ec2 instance type
)
```

<!--
You'll want to adjust the HF_TASK to be the task you want - in our case, "translation".
-->

---
layout: section
---

# Checking the status of the deployment


```zsh
aws sagemaker list-endpoints --query "Endpoints[].EndpointName" --output table
```

```zsh
aws sagemaker describe-endpoint --endpoint-name ENDPOINT_NAME
```

Once the `EndpointStatus` is `InService`, it is ready to be used.

<!--
1. list-endpoints to get the endpoint's name
2. describe-endpoint to get the status
-->

---
layout: section
---

# Client-side setup

<!--
With our model online, all that is left is to interact with it via our blog's build process. There are a few bits of configuration needed to allow our client to talk to our AWS SageMaker endpoint.
-->


---
layout: section
---

# Dependencies

Start by creating your Nuxt app with the required dependencies:

```zsh {*|1|2}
npx nuxi@latest init content-app -t content
npm install @aws-sdk/client-sagemaker-runtime
```

---
layout: section
---

# .env

Place our AWS configuration

```zsh
aws sagemaker list-endpoints --query "Endpoints[].EndpointName" --output table
```

into our .env file:

```ts
AWS_ENDPOINT_NAME='huggingface-pytorch-inference-2025-01-14-22-34-04-107'
AWS_REGION='us-west-2'
```

---
layout: section
---

# nuxt.config.ts

Ensure our .env variables are accessible within Nuxt's runtimeConfig.

```ts
export default defineNuxtConfig({
    modules: ['@nuxt/content'],

    runtimeConfig: {
        AWS_ENDPOINT_NAME: process.env.AWS_ENDPOINT_NAME,
        AWS_REGION: process.env.AWS_REGION,
    },

    compatibilityDate: '2025-01-14',
})
```


---
layout: section
---

# AWS SageMaker
## Javascript SDK

<!--
With our environment in place, we are ready to interact with our hosted endpoint using the AWS SageMaker's Javascript SDK.

This SDK handles a lot of the heavy-lifting, taking care of aspects like authentication, so we can use the model easily.

Just make sure you have the AWS CLI installed and you have authenticated there using the aws configure command.

The SDK will let you work with any of your hosted models within a few simple method calls.
 -->

---
layout: section
---

# Invoke Sagemaker Endpoint

```ts {*|14|17-27|30}{maxHeight: '1200px'}
import {
    SageMakerRuntimeClient,
    InvokeEndpointCommand,
} from '@aws-sdk/client-sagemaker-runtime'

export async function invokeSageMakerEndpoint(
    endpointName: string,
    region: string,
    inputText: string,
    srcLang: string,
    targetLang: string
) {
    // Initialize the SageMaker Runtime Client
    const client = new SageMakerRuntimeClient({ region })

    // Create the command to invoke the endpoint
    const command = new InvokeEndpointCommand({
        EndpointName: endpointName,
        Body: JSON.stringify({
            inputs: inputText,
            // These parameter's are specific to the model we are using
            parameters: {
                src_lang: srcLang,
                tgt_lang: targetLang,
            },
        }),
    })

    // Send the command and get the response
    const response = await client.send(command)
    const decodedResponse = JSON.parse(new TextDecoder().decode(response.Body))

    return decodedResponse
}

```

---
layout: section
---

# Hooking into our blog's build hooks

```ts{*|4|5-8|10|11-17}{maxHeight: '1200px'}
import { invokeSageMakerEndpoint } from '../utils/invokeSageMakerEndpoint'

export default defineNitroPlugin(async nitroApp => {
    const { AWS_ENDPOINT_NAME, AWS_REGION } = useRuntimeConfig()
    const lang = {
        src: 'eng',
        tgt: 'spa',
    }

    nitroApp.hooks.hook('content:file:beforeParse', async file => {
        const response = await invokeSageMakerEndpoint(
            AWS_ENDPOINT_NAME,
            AWS_REGION,
            file.body,
            lang.src,
            lang.tgt
        )
    })
})
```

---
layout: section
---

# Translation response

In my case, I only have a single markdown file located at `content/index.md` with the content:

```md
# Hello world
```

Logging the `invokeSageMakerEndpoint` response:

```json
[ { translation_text: 'Hola mundo' } ]
```

<!--
Now that we're getting translations back, we can write the content to it's own file.
-->

---
layout: section
---

# Creating the translated file

```ts{*|21}{maxHeight: '1200px'}
import { invokeSageMakerEndpoint } from '../utils/invokeSageMakerEndpoint'
import { handleFileCreation } from '../utils/handleFileCreation'

export default defineNitroPlugin(async nitroApp => {
    const { AWS_ENDPOINT_NAME, AWS_REGION } = useRuntimeConfig()
    const lang = {
        src: 'eng',
        tgt: 'spa',
    }

    nitroApp.hooks.hook('content:file:beforeParse', async file => {
        const response: [{ translation_text: string }] =
            await invokeSageMakerEndpoint(
                AWS_ENDPOINT_NAME,
                AWS_REGION,
                file.body,
                lang.src,
                lang.tgt
            )

        handleFileCreation(file, response[0].translation_text, lang.tgt)
    })
})
```

<!--
- Taking in each file from the beforeParse hook.
- The translated text from the file
- The text's target language to dictate where to save it

I'm not going to dig into the handleFileCreation function because it's large and unruly, but it's simple parsing the markdown response from SageMaker and re-building the file within it's appropriate directory.

In this case, content/index.md would be translated and saved to content/spa/index.md with the newly translated content.
-->

---
layout: section
---

# Conclusion

### We've walked through the complete process of automating multilingual content generation for your Nuxt Content blog using AWS SageMaker.

This automation brings several key benefits:

- Eliminates the manual effort of managing translations
- Significantly reduces localization costs
- Expands your blog's reach to a global audience
- Maintains content consistency across all languages
- Scales effortlessly as your content grows



---
layout: default
---

# Thank you!

### @codybontecou
### codybontecou@gmail.com

<div class="absolute bottom-10">
  <img class="w-[200px]" src="https://i.imgur.com/o95BLp0.png" rel="nofollow" alt="qr code">
  <a href="https://aws-technical-presentation.vercel.app/" class="text-sm font-700">
      https://aws-technical-presentation.vercel.app/
  </a>
</div>

<div class="absolute bottom-10 right-0">
  <img class="w-[200px]" src="https://i.imgur.com/2u3JcX4.png" rel="nofollow" alt="qr code">
  <a href="https://github.com/CodyBontecou/sagemaker-huggingface" class="text-sm font-700">
    https://github.com/CodyBontecou/sagemaker-huggingface
  </a>
</div>
