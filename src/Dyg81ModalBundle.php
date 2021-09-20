<?php

namespace Dyg81\ModalBundle;

use Symfony\Component\HttpKernel\Bundle\Bundle;

class Dyg81ModalBundle extends Bundle
{
    public function getPath(): string
    {
        return \dirname(__DIR__);
    }
}
