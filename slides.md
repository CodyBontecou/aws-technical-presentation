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
- Automating the translations in our blog's build
- Automate the workflow through a CI pipeline powered by GitHub Actions.

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
AWS SageMaker is a leading solution for all-things ML models:

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


# Lets Set Up Our Translation Model


---
layout: default
---

# SeamlessM4T v2

### SeamlessM4T-v2 supports:

- 101 languages for speech input
- 96 languages for text input/output
- 35 languages for speech output

### SeamlessM4T-v2 tasks:

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
layout: default
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


```python {4-9|11-15|13|14|17-24|26-30}
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
